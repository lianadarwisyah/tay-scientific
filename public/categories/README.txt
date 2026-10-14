CATEGORY PHOTOS (Products page)
The photos are set in src/lib/categoryPhotos.ts. By default they are free Unsplash photos.

To use your own photo for a category:
1. Save a square photo (about 900 x 900 px, JPG) in this folder, e.g. spectrophotometer.jpg
2. In src/lib/categoryPhotos.ts change that category's line to:
     "spectrophotometer": "/categories/spectrophotometer.jpg",

New category? Add a line with its slug. Without a photo, a coloured tile with an icon is shown.
