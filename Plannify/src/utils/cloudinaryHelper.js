/**
 * Cloudinary Upload Helper
 * Handles unsigned uploads directly from the app
 */

// Your Cloudinary cloud name (from dashboard)
const CLOUD_NAME = 'dv5bf64yx';

// Upload preset name - CREATE THIS IN CLOUDINARY:
// Settings → Upload → Upload Presets → Add new → Set to "Unsigned"
const UPLOAD_PRESET = 'plannify_journal';

/**
 * Upload a local image to Cloudinary
 * @param {string} localUri - Local file URI (file://)
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export const uploadToCloudinary = async (localUri) => {
  // Skip if already a URL or null
  if (!localUri || localUri.startsWith('http')) {
    console.log('⏭️ Skipping upload - already a URL or null:', localUri);
    return localUri;
  }

  console.log('📤 Starting Cloudinary upload for:', localUri);

  try {
    // Extract filename from URI
    const filename = localUri.split('/').pop() || 'image.jpg';
    
    // Determine MIME type
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    console.log('📦 Preparing upload:', { filename, type, preset: UPLOAD_PRESET, cloud: CLOUD_NAME });

    // Create form data for upload
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      type: type,
      name: filename,
    });
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'journal');

    // Upload to Cloudinary
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    console.log('🌐 Uploading to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    console.log('📨 Cloudinary response:', JSON.stringify(data, null, 2));

    if (data.secure_url) {
      console.log('✅ Image uploaded to Cloudinary:', data.secure_url);
      return data.secure_url;
    }

    // Handle error response
    console.error('❌ Cloudinary error:', data.error);
    throw new Error(data.error?.message || 'Upload failed');
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Check if a URI is a remote URL (already uploaded)
 */
export const isCloudinaryUrl = (uri) => {
  if (!uri) return false;
  return uri.includes('cloudinary.com') || uri.startsWith('https://res.cloudinary.com');
};
