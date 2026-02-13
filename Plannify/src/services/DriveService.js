import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
// Critical: Use legacy import for Expo SDK 52+ compatibility
import * as FileSystem from "expo-file-system/legacy";
import JSZip from "jszip";

const getAccessToken = async () => {
  const tokens = await GoogleSignin.getTokens();
  return tokens.accessToken;
};

// --- BACKUP ---
export const backupToDrive = async (onProgress) => {
  try {
    const token = await getAccessToken();
    const zip = new JSZip();

    // 1. Preparation
    if (onProgress) onProgress({ status: "Preparing data...", progress: 0.1 });
    
    // Backup App Data
    const allKeys = await AsyncStorage.getAllKeys();
    const allData = await AsyncStorage.multiGet(allKeys);
    const dataObj = {};
    allData.forEach(([key, value]) => {
      dataObj[key] = value;
    });
    zip.file("app_data.json", JSON.stringify(dataObj));

    // 1.5 Find ALL Images (Filesystem Scan + Reference Check)
    const imgFolder = zip.folder("images");
    const includedFileNames = new Set(); // To avoid duplicates

    // A. Helper to process a file URI
    const processImageFile = async (uri) => {
        try {
            if (!uri) return;
            
            let fileUri = uri;
            // Handle file:// prefix
            if (!fileUri.startsWith("file://") && !fileUri.startsWith("content://") && !fileUri.startsWith("/")) {
                 // Assume relative to doc dir if no scheme (unlikely but safe)
                 fileUri = FileSystem.documentDirectory + uri;
            }
            
            // Skip cloud URLs
            if (fileUri.startsWith("http")) return;

            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            if (!fileInfo.exists) return;

            const fileName = fileUri.split('/').pop();
            
            // Avoid adding same file twice
            if (includedFileNames.has(fileName)) return;
            
            const fileContent = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            
            imgFolder.file(fileName, fileContent, { base64: true });
            includedFileNames.add(fileName);
        } catch (e) {
            console.log("Error processing backup image:", uri, e.message);
        }
    };

    // B. Scan Journal Data for references
    if (dataObj["journal_data"]) {
        try {
            const journals = JSON.parse(dataObj["journal_data"]);
            if (Array.isArray(journals)) {
                await Promise.all(journals.map(entry => processImageFile(entry.image)));
            }
        } catch (e) {
            console.warn("Failed to parse journal_data for backup images", e);
        }
    }

    // C. Scan Document Directory (Catch-all)
    const dirContent = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    await Promise.all(dirContent.map(file => {
        const lower = file.toLowerCase();
        if (
            lower.endsWith(".jpg") || lower.endsWith(".jpeg") || 
            lower.endsWith(".png") || lower.endsWith(".heic") || 
            lower.endsWith(".webp") || lower.endsWith(".gif")
        ) {
            return processImageFile(FileSystem.documentDirectory + file);
        }
    }));

    // 2. Compression
    if (onProgress) onProgress({ status: "Compressing backup...", progress: 0.3 });
    
    const zipBase64 = await zip.generateAsync(
      { type: "base64" },
      (metadata) => {
        if (onProgress && metadata.percent) {
          const compressionProgress = 0.3 + (metadata.percent / 100) * 0.3;
          onProgress({ 
            status: `Compressing: ${metadata.percent.toFixed(0)}%`, 
            progress: compressionProgress 
          });
        }
      }
    );

    // 3. Cleanup Old Backups
    if (onProgress) onProgress({ status: "Cleaning old backups...", progress: 0.6 });
    await deleteBackupFromDrive();

    // 4. Upload to Drive
    if (onProgress) onProgress({ status: "Starting upload...", progress: 0.65 });
    
    const boundary = "foo_bar_baz";
    const metadata = {
      name: "personal_planner_backup.zip",
      mimeType: "application/zip",
      parents: ["appDataFolder"],
    };

    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/zip\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${zipBase64}\r\n` +
      `--${boundary}--`;

    // Calculate EXACT body size (string length is close approximation to bytes for this content)
    const exactTotalBytes = body.length;
    let totalSizeMB = (exactTotalBytes / (1024 * 1024)).toFixed(2);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(
        "POST",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
      );
      
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Content-Type", `multipart/related; boundary=${boundary}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const currentBytes = event.loaded;
            const totalBytes = exactTotalBytes; // Use our calculated total
            
            const uploadPercentage = Math.min(event.loaded / totalBytes, 1);
            const overallProgress = 0.65 + uploadPercentage * 0.35;
            
            const uploadedMB = (currentBytes / (1024 * 1024)).toFixed(2);
            
            // Update total only if event.total is larger (unlikely but safe)
            if (event.total > totalBytes && event.total > 0) {
                 totalSizeMB = (event.total / (1024 * 1024)).toFixed(2);
            }

            onProgress({
              status: `Uploading: ${uploadedMB}MB / ${totalSizeMB}MB`,
              progress: overallProgress,
              details: { uploaded: uploadedMB, total: totalSizeMB }
            });
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress({ status: "Backup Complete!", progress: 1.0, details: { uploaded: totalSizeMB, total: totalSizeMB } });
          resolve({ success: true, date: new Date(), size: totalSizeMB });
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error?.message || "Upload failed"));
          } catch (e) {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error during upload"));
      };

      xhr.send(body);
    });

  } catch (error) {
    console.error("Backup Failed:", error);
    throw error;
  }
};

// --- DELETE BACKUP ---
export const deleteBackupFromDrive = async () => {
  try {
    const token = await getAccessToken();
    const files = await findExistingBackups(token);
    
    if (files.length === 0) return { success: true, count: 0 };
    
    console.log(`Found ${files.length} existing backups to delete.`);
    
    await Promise.all(
      files.map(file => 
        fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    
    return { success: true, count: files.length };
  } catch (error) {
    console.error("Delete Backup Failed:", error);
    throw error;
  }
};

// --- RESTORE ---
export const restoreFromDrive = async (onProgress) => {
  try {
    const token = await getAccessToken();
    
    if (onProgress) onProgress({ status: "Searching for backup..." });
    
    const files = await findExistingBackups(token);
    if (!files || files.length === 0) {
      throw new Error("No backup found on Drive.");
    }
    const fileId = files[0].id;

    // 1. Download
    if (onProgress) onProgress({ status: "Downloading backup..." });
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const blob = await response.blob();
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          if (onProgress) onProgress({ status: "Processing backup file..." });
          
          const base64Data = reader.result.split(",")[1];
          const zip = new JSZip();
          const unzipped = await zip.loadAsync(base64Data, { base64: true });

          // 2. Restore Images
          if (onProgress) onProgress({ status: "Restoring images..." });
          
          const imgFolder = unzipped.folder("images");
          const savedImages = new Set();
          
          if (imgFolder) {
            const imagePromises = [];
            imgFolder.forEach((relativePath, file) => {
              const promise = (async () => {
                // Determine filenames (handle flattened structure)
                const fileName = relativePath.split('/').pop();
                const targetUri = FileSystem.documentDirectory + fileName;
                
                const content = await file.async("base64");
                await FileSystem.writeAsStringAsync(targetUri, content, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                savedImages.add(fileName);
              })();
              imagePromises.push(promise);
            });
            await Promise.all(imagePromises);
          }

          // 3. Restore App Data & Fix Paths
          if (onProgress) onProgress({ status: "Restoring app data..." });
          
          const dataFile = unzipped.file("app_data.json");
          if (dataFile) {
            const jsonStr = await dataFile.async("string");
            const dataObj = JSON.parse(jsonStr);
            
            // Path Fixer: Update journal entries to point to new local path
            if (dataObj["journal_data"]) {
                const journals = JSON.parse(dataObj["journal_data"]);
                const updatedJournals = journals.map(entry => {
                    if (entry.image && !entry.image.startsWith("http")) {
                        const fileName = entry.image.split('/').pop();
                        // Only update if we actually restored this image
                        if (savedImages.has(fileName)) {
                            return {
                                ...entry,
                                image: FileSystem.documentDirectory + fileName
                            };
                        }
                    }
                    return entry;
                });
                dataObj["journal_data"] = JSON.stringify(updatedJournals);
            }

            const pairs = Object.entries(dataObj);
            await AsyncStorage.multiSet(pairs);
          }

          if (onProgress) onProgress({ status: "Restore Complete!" });
          resolve({ success: true });
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Restore Failed:", error);
    throw error;
  }
};

const findExistingBackups = async (token) => {
  const query =
    "name = 'personal_planner_backup.zip' and 'appDataFolder' in parents and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=appDataFolder`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  if (data.files && data.files.length > 0) {
    return data.files;
  }
  return [];
};
