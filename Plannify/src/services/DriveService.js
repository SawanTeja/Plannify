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
export const backupToDrive = async () => {
  try {
    const token = await getAccessToken();
    const zip = new JSZip();

    // 1. Backup App Data
    const allKeys = await AsyncStorage.getAllKeys();
    const allData = await AsyncStorage.multiGet(allKeys);
    const dataObj = {};
    allData.forEach(([key, value]) => {
      dataObj[key] = value;
    });
    zip.file("app_data.json", JSON.stringify(dataObj));

    // 2. Backup Images
    const dirContent = await FileSystem.readDirectoryAsync(
      FileSystem.documentDirectory,
    );
    const imageFiles = dirContent.filter(
      (file) =>
        file.endsWith(".jpg") ||
        file.endsWith(".png") ||
        file.endsWith(".jpeg"),
    );

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

    const zipBase64 = await zip.generateAsync({ type: "base64" });

    // 3. Upload to Drive
    const fileId = await findExistingBackupId(token);
    const boundary = "foo_bar_baz";

    // Metadata logic: Parents only on CREATE
    const metadata = {
      name: "personal_planner_backup.zip",
      mimeType: "application/zip",
    };

    let method = "POST";
    let url =
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

    if (fileId) {
      method = "PATCH";
      url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
    } else {
      metadata.parents = ["appDataFolder"];
    }

    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/zip\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${zipBase64}\r\n` +
      `--${boundary}--`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    const result = await response.json();
    if (result.error) throw new Error(result.error.message);

    return { success: true, date: new Date() };
  } catch (error) {
    console.error("Backup Failed:", error);
    throw error;
  }
};

// --- RESTORE ---
export const restoreFromDrive = async () => {
  try {
    const token = await getAccessToken();
    const fileId = await findExistingBackupId(token);

    if (!fileId) {
      throw new Error("No backup found on Drive.");
    }

    // 1. Download
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
          const base64Data = reader.result.split(",")[1];
          const zip = new JSZip();
          const unzipped = await zip.loadAsync(base64Data, { base64: true });

          // 2. Restore Data
          const dataFile = unzipped.file("app_data.json");
          if (dataFile) {
            const jsonStr = await dataFile.async("string");
            const dataObj = JSON.parse(jsonStr);
            const pairs = Object.entries(dataObj);
            await AsyncStorage.multiSet(pairs);
          }

          // 3. Restore Images (Wait for all to finish)
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

const findExistingBackupId = async (token) => {
  const query =
    "name = 'personal_planner_backup.zip' and 'appDataFolder' in parents and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&spaces=appDataFolder`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
};
