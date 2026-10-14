/**
 * ✏️ Category photos for the Products page.
 *
 * These are free photos from Unsplash (Unsplash License: free for commercial use, no credit required).
 * To use your OWN photo instead: save it as /public/categories/<slug>.jpg (square, about 900 x 900 px)
 * and change that line to e.g.  "spectrophotometer": "/categories/spectrophotometer.jpg",
 * A category not listed here shows a coloured tile with an icon.
 */
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=900&q=70`;

export const categoryPhotos: Record<string, string> = {
  // Three beakers with coloured solutions (Hans Reniers)
  "analytical-chemicals": unsplash("1532094349884-543bc11b234d"),
  // Test tubes with different coloured liquids (Ryan Zazueta)
  "standard-chemicals": unsplash("1694230155228-cdde50083573"),
  // Industrial pipes and valves in a plant (Ricardo Gomez Angel)
  "industrial-chemicals": unsplash("1620203853151-496c7228306c"),
  // Scientist holding a petri dish (Drew Hays)
  "life-science": unsplash("1486825586573-7131f7991bdd"),
  // Lab workbench with microscope and analytical equipment (Trnava University)
  "equipment": unsplash("1602052577122-f73b9710adba"),
  // Gloved hand holding a beaker of water sample (RephiLe water)
  "environmental-equipment": unsplash("1617155093730-a8bf47be792d"),
  // Automated instrument dispensing samples into vials (National Cancer Institute)
  // Tip: replace with a photo of the spectrophotometer you actually sell.
  "spectrophotometer": unsplash("1578496479531-32e296d5c6e1"),
  // Laboratory flasks with coloured liquids (Alex Kondratiev)
  "consumables": unsplash("1554475900-0a0350e3fc7b"),
};
