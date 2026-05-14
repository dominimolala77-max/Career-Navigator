export interface Subject {
  name: string;
  code: string;
  category: "Language" | "Mathematics" | "Sciences" | "Commerce" | "Humanities" | "Services" | "Arts" | "Technology" | "Agriculture" | "LifeOrientation";
}

export const SA_SUBJECTS: Subject[] = [
  // Life Orientation
  { name: "Life Orientation", code: "LO", category: "LifeOrientation" },
  
  // Official Languages (Home Language)
  { name: "Afrikaans Home Language", code: "AFR-HL", category: "Language" },
  { name: "English Home Language", code: "ENG-HL", category: "Language" },
  { name: "isiNdebele Home Language", code: "NDE-HL", category: "Language" },
  { name: "isiXhosa Home Language", code: "XHO-HL", category: "Language" },
  { name: "isiZulu Home Language", code: "ZUL-HL", category: "Language" },
  { name: "Sepedi Home Language", code: "SEP-HL", category: "Language" },
  { name: "Sesotho Home Language", code: "SOT-HL", category: "Language" },
  { name: "Setswana Home Language", code: "TSW-HL", category: "Language" },
  { name: "Siswati Home Language", code: "SWZ-HL", category: "Language" },
  { name: "Tshivenda Home Language", code: "VEN-HL", category: "Language" },
  { name: "Xitsonga Home Language", code: "TSO-HL", category: "Language" },
  
  // Official Languages (First Additional Language)
  { name: "Afrikaans First Additional Language", code: "AFR-FAL", category: "Language" },
  { name: "English First Additional Language", code: "ENG-FAL", category: "Language" },
  { name: "isiNdebele First Additional Language", code: "NDE-FAL", category: "Language" },
  { name: "isiXhosa First Additional Language", code: "XHO-FAL", category: "Language" },
  { name: "isiZulu First Additional Language", code: "ZUL-FAL", category: "Language" },
  { name: "Sepedi First Additional Language", code: "SEP-FAL", category: "Language" },
  { name: "Sesotho First Additional Language", code: "SOT-FAL", category: "Language" },
  { name: "Setswana First Additional Language", code: "TSW-FAL", category: "Language" },
  { name: "Siswati First Additional Language", code: "SWZ-FAL", category: "Language" },
  { name: "Tshivenda First Additional Language", code: "VEN-FAL", category: "Language" },
  { name: "Xitsonga First Additional Language", code: "TSO-FAL", category: "Language" },

  // Mathematics
  { name: "Mathematics", code: "MATH", category: "Mathematics" },
  { name: "Mathematical Literacy", code: "MATH-LIT", category: "Mathematics" },
  { name: "Technical Mathematics", code: "TECH-MATH", category: "Mathematics" },

  // Sciences
  { name: "Physical Sciences", code: "PHY-SCI", category: "Sciences" },
  { name: "Life Sciences", code: "LIFE-SCI", category: "Sciences" },
  { name: "Technical Sciences", code: "TECH-SCI", category: "Sciences" },

  // Commerce
  { name: "Accounting", code: "ACC", category: "Commerce" },
  { name: "Business Studies", code: "BUS-STU", category: "Commerce" },
  { name: "Economics", code: "ECON", category: "Commerce" },

  // Humanities
  { name: "Geography", code: "GEO", category: "Humanities" },
  { name: "History", code: "HIST", category: "Humanities" },
  { name: "Religion Studies", code: "REL-STU", category: "Humanities" },

  // Technology
  { name: "Information Technology (IT)", code: "IT", category: "Technology" },
  { name: "Computer Applications Technology (CAT)", code: "CAT", category: "Technology" },
  { name: "Engineering Graphics and Design (EGD)", code: "EGD", category: "Technology" },
  
  // Civil Technology
  { name: "Civil Technology (Construction)", code: "CIV-TECH-C", category: "Technology" },
  { name: "Civil Technology (Woodworking)", code: "CIV-TECH-W", category: "Technology" },
  { name: "Civil Technology (Civil Services)", code: "CIV-TECH-S", category: "Technology" },
  
  // Electrical Technology
  { name: "Electrical Technology (Digital Electronics)", code: "ELEC-TECH-D", category: "Technology" },
  { name: "Electrical Technology (Electronics)", code: "ELEC-TECH-E", category: "Technology" },
  { name: "Electrical Technology (Power Systems)", code: "ELEC-TECH-P", category: "Technology" },
  
  // Mechanical Technology
  { name: "Mechanical Technology (Automotive)", code: "MECH-TECH-A", category: "Technology" },
  { name: "Mechanical Technology (Fitting and Machining)", code: "MECH-TECH-F", category: "Technology" },
  { name: "Mechanical Technology (Welding and Metalwork)", code: "MECH-TECH-W", category: "Technology" },

  // Services
  { name: "Consumer Studies", code: "CON-STU", category: "Services" },
  { name: "Hospitality Studies", code: "HOS-STU", category: "Services" },
  { name: "Tourism", code: "TOUR", category: "Services" },

  // Arts
  { name: "Dramatic Arts", code: "DRAM-ART", category: "Arts" },
  { name: "Visual Arts", code: "VIS-ART", category: "Arts" },
  { name: "Music", code: "MUSIC", category: "Arts" },
  { name: "Dance Studies", code: "DANCE", category: "Arts" },
  { name: "Design", code: "DESIGN", category: "Arts" },

  // Agriculture
  { name: "Agricultural Sciences", code: "AGR-SCI", category: "Agriculture" },
  { name: "Agricultural Management Practices", code: "AGR-MAN", category: "Agriculture" },
  { name: "Agricultural Technology", code: "AGR-TECH", category: "Agriculture" },
];
