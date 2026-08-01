const fs = require('fs');
const path = require('path');

const CLOUD_NAME = 'xb6thsac';
const UPLOAD_PRESET = 'dw90puyp';

async function main() {
  const filePath = path.join(__dirname, '..', 'public', 'Voice_Of_Preemies_Logo.png');
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], 'test-upload-logo.png', { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'voice-of-preemies/test');

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Upload failed:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('Upload succeeded:');
  console.log('  secure_url:', data.secure_url);
  console.log('  bytes:', data.bytes);
  console.log('  format:', data.format);
  console.log('  width x height:', data.width, 'x', data.height);
  console.log('  public_id:', data.public_id);
}

main().catch((err) => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
