const https = require('https');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

const images = [
  { file: 'toothbrush.jpg',       url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80' },
  { file: 'water-bottle.jpg',     url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80' },
  { file: 'tshirt.jpg',           url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80' },
  { file: 'kitchen-utensils.jpg', url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80' },
  { file: 'sneakers.jpg',         url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80' },
  { file: 'soap.jpg',             url: 'https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=600&q=80' },
  { file: 'plant-pot.jpg',        url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80' },
  { file: 'notebook.jpg',         url: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=600&q=80' },
  { file: 'power-bank.jpg',       url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80' },
  { file: 'cutting-board.jpg',    url: 'https://images.unsplash.com/photo-1606851091851-e8c8c0fca5ba?w=600&q=80' },
  { file: 'tote-bag.jpg',         url: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600&q=80' },
  { file: 'deodorant.jpg',        url: 'https://images.unsplash.com/photo-1622480916113-9000ac49b79d?w=600&q=80' },
  { file: 'phone-case.jpg',       url: 'https://images.unsplash.com/photo-1585060544812-6b45742d762f?w=600&q=80' },
  { file: 'desk-organizer.jpg',   url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80' },
  { file: 'yoga-mat.jpg',         url: 'https://images.unsplash.com/photo-1601925228880-7e39e5d2f14c?w=600&q=80' },
  { file: 'face-cream.jpg',       url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80' },
  { file: 'wallet.jpg',           url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&q=80' },
  { file: 'lamp.jpg',             url: 'https://images.unsplash.com/photo-1513506003901-1e6a35082f8b?w=600&q=80' },
  { file: 'tea-set.jpg',          url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80' },
  { file: 'backpack.jpg',         url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80' },
];

function download(file, url) {
  return new Promise((resolve, reject) => {
    const dest = path.join(imgDir, file);
    const f = fs.createWriteStream(dest);
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        f.close();
        download(file, res.headers.location).then(resolve).catch(reject);
        return;
      }
      res.pipe(f);
      f.on('finish', () => { f.close(); console.log(`✅ ${file}`); resolve(); });
    }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
  });
}

(async () => {
  console.log('📥 Downloading product images...\n');
  for (const img of images) {
    try { await download(img.file, img.url); }
    catch(e) { console.log(`❌ ${img.file}: ${e.message}`); }
  }
  console.log('\n✅ Done! Now run the SQL in update_images.sql to update the database.');
})();
