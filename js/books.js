/* ==========================================================
   books.js — আসাতিজায়ে কেরামের রচিত কিতাব

   এক লেখকের নিচে একাধিক কিতাব রাখা যায়। নতুন লেখক যোগ করতে একটি পুরো { author: ..., books: [...] } ব্লক কপি করুন।
   নতুন কিতাব যোগ করতে books এর ভেতরে একটি { ... }, ব্লক কপি করুন।

   কিতাবের ঘরগুলো:
     title        : কিতাবের নাম
     description  : সংক্ষিপ্ত বিবরণ
     language     : ভাষা (যেমন "বাংলা", "আরবি", "উর্দু")
     price        : দাম (শুধু সংখ্যা, যেমন 250) — না জানালে "" রাখুন
     status       : "available" (সংগ্রহে আছে) | "soon" (শীঘ্রই আসছে) | "unavailable" (নেই)
     cover        : কভার ছবির পথ, যেমন "assets/books/mybook.jpg" — না থাকলে "" রাখুন (স্বয়ংক্রিয় কভার দেখাবে)
     whatsapp     : এই কিতাব সংগ্রহের জন্য আলাদা নম্বর (ঐচ্ছিক; লেখকের ঘরেও দেওয়া যায়) — না দিলে config.js এর নম্বর ব্যবহার হবে
     sample       : true দিলে "নমুনা" ব্যাজ দেখায় — আসল কিতাব দিলে এই লাইন মুছে দিন
   ========================================================== */
const booksData = [
  {
    author: "মুহিউস সুন্নাহ আল্লামা মাহমূদুল হাসান",
    bio: "",
    whatsapp: "01670741189",
    books: [
      { title: "তোহফায়ে সুন্নাহ", description: "", language: "বাংলা", price: "", status: "available", cover: "assets/books/tohfaye-sunnah.jpg" }
    ]
  },
  {
    author: "মাওলানা মুহাম্মদ সিরাজুল ইসলাম",
    bio: "",
    whatsapp: "01625642347",
    books: [
      { title: "সিরাজুম মুনীর (বাংলা সহজ নাহবেমীর)", description: "", language: "বাংলা", price: "", status: "available", cover: "" }
    ]
  },
  {
    author: "মুফতি জুনায়েদ জুলফিকার",
    bio: "",
    whatsapp: "01628486824",
    books: [
      { title: "সহজে আরবি ইবারত শিখি", description: "", language: "বাংলা", price: "", status: "available", cover: "assets/books/shohoje-arabi-ibarot-shikhi.jpg" },
      { title: "BONUS নামাজ এর বাংলা", description: "", language: "বাংলা", price: "", status: "available", cover: "assets/books/bonus-namaz-er-bangla.jpg" },
      { title: "দরসে উসুলুশ শাশি", description: "", language: "বাংলা", price: "", status: "available", cover: "assets/books/dorse-usulus-shashi.jpg" }
    ]
  }
];
