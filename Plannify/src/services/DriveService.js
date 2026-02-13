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

    // Backup Images
    const dirContent = await FileSystem.readDirectoryAsync(
      FileSystem.documentDirectory,
    );
    
    // Enhanced image filtering (case-insensitive + more types)
    const imageFiles = dirContent.filter((file) => {
        const lower = file.toLowerCase();
        return (
            lower.endsWith(".jpg") ||
            lower.endsWith(".jpeg") ||
            lower.endsWith(".png") ||
            lower.endsWith(".heic") ||
            lower.endsWith(".webp") ||
            lower.endsWith(".gif")
        );
    });

    const imgFolder = zip.folder("images");

    // Read all images in parallel
    await Promise.all(
      imageFiles.map(async (file) => {
        const fileUri = FileSystem.documentDirectory + file;
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        imgFolder.file(file, fileContent, { base64: true });
      }),
    );

    // 2. Compression
    if (onProgress) onProgress({ status: "Compressing backup...", progress: 0.3 });
    
    const zipBase64 = await zip.generateAsync(
      { type: "base64" },
      (metadata) => {
        if (onProgress && metadata.percent) {
          // Map compression (0-100) to overall progress (0.3 - 0.6)
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

    // 4. Upload to Drive using XMLHttpRequest for progress
    if (onProgress) onProgress({ status: "Starting upload...", progress: 0.65 });
    
    // Rough estimate before upload starts (base64 size is approx)
    let totalSizeMB = (zipBase64.length / (1024 * 1024)).toFixed(2);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const boundary = "foo_bar_baz";
      
      const metadata = {
        name: "personal_planner_backup.zip",
        mimeType: "application/zip",
        parents: ["appDataFolder"], // Hidden app data folder
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

      xhr.open(
        "POST",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart"
      );
      
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Content-Type", `multipart/related; boundary=${boundary}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            // Map upload (0-100) to overall progress (0.65 - 1.0)
            const uploadPercentage = event.loaded / event.total;
            const overallProgress = 0.65 + uploadPercentage * 0.35;
            
            // Calculate upload size progress using ACTUAL bytes
            const uploadedMB = (event.loaded / (1024 * 1024)).toFixed(2);
            
            // Update totalSizeMB with exact value from event
            totalSizeMB = (event.total / (1024 * 1024)).toFixed(2);
            
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
    
    // Delete all found backup files
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
    
    // Use the most recent backup if multiple exist (though we now delete duplicates)
    // Files from Google Drive API are not guaranteed order, but typically we just take the first one
    const fileId = files[0].id; // Simplified for now

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

          // 2. Restore Data
          if (onProgress) onProgress({ status: "Restoring app data..." });
          
          const dataFile = unzipped.file("app_data.json");
          if (dataFile) {
            const jsonStr = await dataFile.async("string");
            const dataObj = JSON.parse(jsonStr);
            const pairs = Object.entries(dataObj);
            await AsyncStorage.multiSet(pairs);
          }

          // 3. Restore Images (Wait for all to finish)
          if (onProgress) onProgress({ status: "Restoring images..." });
          
          const imgFolder = unzipped.folder("images");
          if (imgFolder) {
            const imagePromises = [];
            imgFolder.forEach((relativePath, file) => {
              const promise = (async () => {
                const content = await file.async("base64");
                const targetUri = FileSystem.documentDirectory + relativePath;
                await FileSystem.writeAsStringAsync(targetUri, content, {
                  encoding: FileSystem.EncodingType.Base64,
                });
              })();
              imagePromises.push(promise);
            });

            // Critical Fix: Wait for all images to write before finishing
            await Promise.all(imagePromises);
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
