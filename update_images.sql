USE ecocart;
SET SQL_SAFE_UPDATES = 0;

UPDATE products SET image_url = '/images/toothbrush.jpg'       WHERE id = 1;
UPDATE products SET image_url = '/images/water-bottle.jpg'     WHERE id = 2;
UPDATE products SET image_url = '/images/tshirt.jpg'           WHERE id = 3;
UPDATE products SET image_url = '/images/kitchen-utensils.jpg' WHERE id = 4;
UPDATE products SET image_url = '/images/sneakers.jpg'         WHERE id = 5;
UPDATE products SET image_url = '/images/soap.jpg'             WHERE id = 6;
UPDATE products SET image_url = '/images/plant-pot.jpg'        WHERE id = 7;
UPDATE products SET image_url = '/images/notebook.jpg'         WHERE id = 8;
UPDATE products SET image_url = '/images/power-bank.jpg'       WHERE id = 9;
UPDATE products SET image_url = '/images/cutting-board.jpg'    WHERE id = 10;
UPDATE products SET image_url = '/images/tote-bag.jpg'         WHERE id = 11;
UPDATE products SET image_url = '/images/deodorant.jpg'        WHERE id = 12;
UPDATE products SET image_url = '/images/phone-case.jpg'       WHERE id = 13;
UPDATE products SET image_url = '/images/desk-organizer.jpg'   WHERE id = 14;
UPDATE products SET image_url = '/images/yoga-mat.jpg'         WHERE id = 15;
UPDATE products SET image_url = '/images/face-cream.jpg'       WHERE id = 16;
UPDATE products SET image_url = '/images/wallet.jpg'           WHERE id = 17;
UPDATE products SET image_url = '/images/lamp.jpg'             WHERE id = 18;
UPDATE products SET image_url = '/images/tea-set.jpg'          WHERE id = 19;
UPDATE products SET image_url = '/images/backpack.jpg'         WHERE id = 20;

SET SQL_SAFE_UPDATES = 1;
SELECT id, name, image_url FROM products ORDER BY id;
