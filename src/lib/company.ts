// Company details. Pulled from tayscientific.com.my; check the items marked CHECK before you go live.
export const company = {
  name: "Tay Scientific Instruments Sdn Bhd",
  shortName: "Tay Scientific",
  domain: "labstoreonline.com",
  mainSite: "https://www.tayscientific.com.my",
  tagline: "Laboratory instruments and supplies, quoted for your lab.",
  email: "info@tayscientific.com.my",
  careersEmail: "admin@tayscientific.com.my", // job applications are sent here
  quotationEmail: "darwisyahliana@gmail.com", // new quotation requests are emailed here (TEST: change to the company inbox later)
  phone: "+607-353 9250",
  phone2: "+607-353 9255",
  // CHECK: tayscientific.com.my lists three WhatsApp numbers. This uses the one shown under "Shop".
  // Others: 60187790021 (site menu), 601121737399 (header button).
  whatsapp: "60122353744", // country code + number, no "+" or spaces
  address: "No. 6, Jalan Mutiara 4, Taman Perindustrian Plentong, 81750 Masai, Johor",
  hours: "Mon – Fri, 8:30 am – 5:30 pm",
  branches: [
    {
      name: "Johor Bahru (Main Office)",
      address: "No. 6, Jalan Mutiara 4, Taman Perindustrian Plentong, 81750 Masai, Johor",
      phones: ["+607-353 9250", "+607-353 9255"],
      email: "info@tayscientific.com.my",
      hours: "Mon – Fri, 8:30 am – 5:30 pm",
    },
    {
      name: "Sabah",
      address: "Lot 3, Block C, Ground Floor & 1st Floor, Lorong Buah Salak 4, Hiong Tiong Industrial Centre, Mile 7, Jalan Tuaran, 88450 Inanam, Sabah",
      phones: ["+6088-424 719", "+6088-423 732"],
      email: "kksales@tayscientific.com.my",
      hours: "Mon – Fri, 8:00 am – 5:00 pm",
    },
  ],
  // Existing staff and customer systems on the main website
  links: {
    checkService: "https://www.tayscientific.com.my/service-recorder/login.php",
    portal: "https://www.tayscientific.com.my/service-recorder/staff-login.php",
  },
  about: [
    "Tay Scientific Instruments Sdn Bhd supplies laboratory instruments, consumables and reagents to research labs, schools, universities and industry across Malaysia.", // CHECK: replace with your own story
    "Instead of an online checkout, we work by quotation. Choose the products you need, send us your list, and our team replies with pricing, availability and delivery details.",
  ],
  highlights: [
    { title: "Quotation first", text: "No payment online. You get a formal quotation to approve." },
    { title: "Authorised brands", text: "Instruments from brands we know and support." }, // CHECK: confirm
    { title: "Local support", text: "Talk to a person by phone, email or WhatsApp." },
  ],
};

export const whatsappLink = (text: string) =>
  `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(text)}`;
