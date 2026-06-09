export interface Programme {
  name: string;
  faculty: string;
  apsRequired: number;
  duration: string;
  description: string;
}

export interface Institution {
  id: string;
  name: string;
  type: "public_university" | "university_of_technology" | "tvet_college" | "private_institution";
  province: string;
  website: string;
  applicationUrl: string;
  passRate: number; // approximate acceptance or success rate for filtering
  minAps: number;
  applicationFee?: number;
  applicationFeeSource?: string;
  description: string;
  programmes: Programme[];
}

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape"
];

// Reusable standard programmes for brevity in the dataset
const standardProgrammes = {
  engineering: { name: "BSc Engineering", faculty: "Engineering", apsRequired: 36, duration: "4 years", description: "Standard engineering degree." },
  commerce: { name: "BCom Accounting", faculty: "Commerce", apsRequired: 30, duration: "3 years", description: "Undergraduate commerce degree." },
  arts: { name: "BA General", faculty: "Humanities", apsRequired: 24, duration: "3 years", description: "General arts degree." },
  science: { name: "BSc Computer Science", faculty: "Science", apsRequired: 32, duration: "3 years", description: "Computer science degree." },
  education: { name: "BEd Foundation Phase", faculty: "Education", apsRequired: 26, duration: "4 years", description: "Teaching degree." },
  agriculture: { name: "BSc Agriculture", faculty: "Science", apsRequired: 30, duration: "4 years", description: "Agricultural science degree." },
};

const tvetProgrammes = {
  nated_eng: { name: "NATED Engineering Studies (N1-N6)", faculty: "Engineering", apsRequired: 16, duration: "18 months", description: "National Certificate in Engineering Studies." },
  nated_bus: { name: "NATED Business Studies (N4-N6)", faculty: "Business", apsRequired: 16, duration: "18 months", description: "National Certificate in Business Management." },
  ncv_it: { name: "NC(V) IT & Computer Science", faculty: "IT", apsRequired: 15, duration: "3 years", description: "National Certificate Vocational." },
  ncv_office: { name: "NC(V) Office Administration", faculty: "Business", apsRequired: 15, duration: "3 years", description: "National Certificate Vocational." },
};

export const UNIVERSITIES: Institution[] = [
  // ─── 26 PUBLIC UNIVERSITIES ──────────────────────────────────────────────────
  {
    id: "uct",
    name: "University of Cape Town (UCT)",
    type: "public_university",
    province: "Western Cape",
    website: "https://www.uct.ac.za",
    applicationUrl: "https://applyonline.uct.ac.za",
    passRate: 20,
    minAps: 34,
    description: "South Africa's oldest university, ranked among the top globally.",
    programmes: [
      { name: "MBChB (Medicine)", faculty: "Health Sciences", apsRequired: 42, duration: "6 years", description: "Highly competitive medical program." },
      { name: "BSc Computer Science", faculty: "Science", apsRequired: 38, duration: "3 years", description: "Premier CS degree." }
    ]
  },
  {
    id: "wits",
    name: "University of the Witwatersrand (Wits)",
    type: "public_university",
    province: "Gauteng",
    website: "https://www.wits.ac.za",
    applicationUrl: "https://www.wits.ac.za/applications/",
    passRate: 25,
    minAps: 34,
    description: "A leading research-intensive university in Johannesburg.",
    programmes: [
      { name: "BSc Mining Engineering", faculty: "Engineering", apsRequired: 36, duration: "4 years", description: "World-class mining engineering program." }
    ]
  },
  { id: "up", name: "University of Pretoria (UP)", type: "public_university", province: "Gauteng", website: "https://www.up.ac.za", applicationUrl: "https://www.up.ac.za/online-application", passRate: 30, minAps: 30, description: "One of SA's largest research universities.", programmes: [standardProgrammes.engineering, standardProgrammes.science] },
  { id: "su", name: "Stellenbosch University", type: "public_university", province: "Western Cape", website: "https://www.sun.ac.za", applicationUrl: "https://student.sun.ac.za", passRate: 28, minAps: 32, description: "A prestigious research university.", programmes: [standardProgrammes.commerce, standardProgrammes.science] },
  { id: "uj", name: "University of Johannesburg (UJ)", type: "public_university", province: "Gauteng", website: "https://www.uj.ac.za", applicationUrl: "https://apply.uj.ac.za", passRate: 40, minAps: 26, description: "Dynamic, modern university in Joburg.", programmes: [standardProgrammes.commerce, standardProgrammes.arts] },
  { id: "nwu", name: "North-West University (NWU)", type: "public_university", province: "North West", website: "https://www.nwu.ac.za", applicationUrl: "https://studies.nwu.ac.za", passRate: 45, minAps: 24, description: "Multi-campus university.", programmes: [standardProgrammes.education, standardProgrammes.arts] },
  { id: "ukzn", name: "University of KwaZulu-Natal (UKZN)", type: "public_university", province: "KwaZulu-Natal", website: "https://www.ukzn.ac.za", applicationUrl: "https://applications.ukzn.ac.za", passRate: 35, minAps: 28, description: "Research-led university.", programmes: [standardProgrammes.science, standardProgrammes.engineering] },
  { id: "ru", name: "Rhodes University", type: "public_university", province: "Eastern Cape", website: "https://www.ru.ac.za", applicationUrl: "https://ross.ru.ac.za", passRate: 30, minAps: 30, description: "Small, high-quality university.", programmes: [standardProgrammes.arts, standardProgrammes.science] },
  { id: "ufs", name: "University of the Free State (UFS)", type: "public_university", province: "Free State", website: "https://www.ufs.ac.za", applicationUrl: "https://apply.ufs.ac.za", passRate: 50, minAps: 24, description: "Historic university in Bloemfontein.", programmes: [standardProgrammes.education, standardProgrammes.commerce] },
  { id: "uwc", name: "University of the Western Cape (UWC)", type: "public_university", province: "Western Cape", website: "https://www.uwc.ac.za", applicationUrl: "https://student.uwc.ac.za", passRate: 45, minAps: 26, description: "Committed to access and excellence.", programmes: [standardProgrammes.arts, standardProgrammes.science] },
  { id: "nmu", name: "Nelson Mandela University (NMU)", type: "public_university", province: "Eastern Cape", website: "https://www.mandela.ac.za", applicationUrl: "https://applyonline.mandela.ac.za", passRate: 45, minAps: 26, description: "Comprehensive university in Gqeberha.", programmes: [standardProgrammes.commerce, standardProgrammes.science] },
  { id: "ufh", name: "University of Fort Hare", type: "public_university", province: "Eastern Cape", website: "https://www.ufh.ac.za", applicationUrl: "https://www.ufh.ac.za/apply", passRate: 55, minAps: 22, description: "Historic university.", programmes: [standardProgrammes.arts, standardProgrammes.education] },
  { id: "wsu", name: "Walter Sisulu University (WSU)", type: "public_university", province: "Eastern Cape", website: "https://www.wsu.ac.za", applicationUrl: "https://ie.wsu.ac.za", passRate: 60, minAps: 20, description: "Comprehensive university.", programmes: [standardProgrammes.education, standardProgrammes.arts] },
  { id: "univen", name: "University of Venda", type: "public_university", province: "Limpopo", website: "https://www.univen.ac.za", applicationUrl: "https://univen.ac.za/apply", passRate: 55, minAps: 22, description: "Rural-based university.", programmes: [standardProgrammes.science, standardProgrammes.agriculture] },
  { id: "ul", name: "University of Limpopo", type: "public_university", province: "Limpopo", website: "https://www.ul.ac.za", applicationUrl: "https://www.ul.ac.za/apply", passRate: 55, minAps: 22, description: "Serving the Limpopo province.", programmes: [standardProgrammes.education, standardProgrammes.arts] },
  { id: "smu", name: "Sefako Makgatho Health Sciences University", type: "public_university", province: "Gauteng", website: "https://www.smu.ac.za", applicationUrl: "https://www.smu.ac.za/apply", passRate: 20, minAps: 30, description: "Specialized in health sciences.", programmes: [{ name: "BPharm", faculty: "Health Sciences", apsRequired: 32, duration: "4 years", description: "Pharmacy degree" }] },
  { id: "unizulu", name: "University of Zululand", type: "public_university", province: "KwaZulu-Natal", website: "https://www.unizulu.ac.za", applicationUrl: "https://www.unizulu.ac.za/apply", passRate: 60, minAps: 22, description: "Comprehensive university in KZN.", programmes: [standardProgrammes.arts, standardProgrammes.education] },
  { id: "mut", name: "Mangosuthu University of Technology", type: "university_of_technology", province: "KwaZulu-Natal", website: "https://www.mut.ac.za", applicationUrl: "https://www.mut.ac.za/apply", passRate: 65, minAps: 20, description: "Technology-focused institution.", programmes: [{ name: "NDip Engineering", faculty: "Engineering", apsRequired: 22, duration: "3 years", description: "National Diploma" }] },
  { id: "dut", name: "Durban University of Technology (DUT)", type: "university_of_technology", province: "KwaZulu-Natal", website: "https://www.dut.ac.za", applicationUrl: "https://www.dut.ac.za/apply", passRate: 55, minAps: 24, description: "Leading UoT in KZN.", programmes: [{ name: "NDip IT", faculty: "IT", apsRequired: 24, duration: "3 years", description: "National Diploma" }] },
  { id: "tut", name: "Tshwane University of Technology (TUT)", type: "university_of_technology", province: "Gauteng", website: "https://www.tut.ac.za", applicationUrl: "https://www.tut.ac.za/apply", passRate: 50, minAps: 22, description: "Largest residential UoT in SA.", programmes: [{ name: "NDip Engineering", faculty: "Engineering", apsRequired: 22, duration: "3 years", description: "National Diploma" }] },
  { id: "cut", name: "Central University of Technology (CUT)", type: "university_of_technology", province: "Free State", website: "https://www.cut.ac.za", applicationUrl: "https://www.cut.ac.za/apply", passRate: 55, minAps: 22, description: "UoT in Free State.", programmes: [{ name: "NDip Engineering", faculty: "Engineering", apsRequired: 22, duration: "3 years", description: "National Diploma" }] },
  { id: "vut", name: "Vaal University of Technology (VUT)", type: "university_of_technology", province: "Gauteng", website: "https://www.vut.ac.za", applicationUrl: "https://www.vut.ac.za/apply", passRate: 60, minAps: 20, description: "UoT in Southern Gauteng.", programmes: [{ name: "NDip Engineering", faculty: "Engineering", apsRequired: 20, duration: "3 years", description: "National Diploma" }] },
  { id: "cput", name: "Cape Peninsula University of Technology (CPUT)", type: "university_of_technology", province: "Western Cape", website: "https://www.cput.ac.za", applicationUrl: "https://www.cput.ac.za/study/apply", passRate: 60, minAps: 22, description: "Largest university in the Western Cape.", programmes: [{ name: "NDip Engineering", faculty: "Engineering", apsRequired: 24, duration: "3 years", description: "National Diploma" }] },
  { id: "ump", name: "University of Mpumalanga", type: "public_university", province: "Mpumalanga", website: "https://www.ump.ac.za", applicationUrl: "https://www.ump.ac.za/apply", passRate: 60, minAps: 22, description: "New comprehensive university.", programmes: [standardProgrammes.education, standardProgrammes.agriculture] },
  { id: "spu", name: "Sol Plaatje University", type: "public_university", province: "Northern Cape", website: "https://www.spu.ac.za", applicationUrl: "https://www.spu.ac.za/apply", passRate: 55, minAps: 24, description: "New university in Kimberley.", programmes: [standardProgrammes.education, standardProgrammes.science] },
  { id: "unisa", name: "University of South Africa (UNISA)", type: "public_university", province: "Gauteng", website: "https://www.unisa.ac.za", applicationUrl: "https://www.unisa.ac.za/apply", passRate: 80, minAps: 18, description: "Largest open distance learning institution in Africa.", programmes: [standardProgrammes.commerce, standardProgrammes.arts, standardProgrammes.science] },

  // ─── PROMINENT PRIVATE UNIVERSITIES & COLLEGES ───────────────────────────────
  { id: "varsitycollege", name: "Varsity College (The IIE)", type: "private_institution", province: "Gauteng", website: "https://www.varsitycollege.co.za", applicationUrl: "https://www.varsitycollege.co.za/apply", passRate: 75, minAps: 20, description: "A brand of The Independent Institute of Education (The IIE).", programmes: [standardProgrammes.commerce, standardProgrammes.science] },
  { id: "rosebank", name: "Rosebank College (The IIE)", type: "private_institution", province: "Gauteng", website: "https://www.rosebankcollege.co.za", applicationUrl: "https://www.rosebankcollege.co.za/apply", passRate: 85, minAps: 18, description: "Affordable, quality private education.", programmes: [standardProgrammes.commerce, standardProgrammes.education] },
  { id: "eduvos", name: "Eduvos", type: "private_institution", province: "Gauteng", website: "https://www.eduvos.com", applicationUrl: "https://www.eduvos.com/apply", passRate: 80, minAps: 18, description: "A large private higher education institution in South Africa.", programmes: [standardProgrammes.commerce, standardProgrammes.science] },
  { id: "stadio", name: "STADIO Higher Education", type: "private_institution", province: "Western Cape", website: "https://www.stadio.ac.za", applicationUrl: "https://www.stadio.ac.za/apply", passRate: 80, minAps: 18, description: "Comprehensive private higher education.", programmes: [standardProgrammes.education, standardProgrammes.commerce] },
  { id: "mancosa", name: "MANCOSA", type: "private_institution", province: "KwaZulu-Natal", website: "https://www.mancosa.co.za", applicationUrl: "https://www.mancosa.co.za/apply", passRate: 85, minAps: 18, description: "Focus on distance management and business education.", programmes: [standardProgrammes.commerce] },
  { id: "boston", name: "Boston City Campus", type: "private_institution", province: "Gauteng", website: "https://www.boston.ac.za", applicationUrl: "https://www.boston.ac.za/apply", passRate: 85, minAps: 16, description: "Offers degrees, diplomas, and higher certificates.", programmes: [standardProgrammes.commerce, standardProgrammes.science] },

  // ─── ALL 50 PUBLIC TVET COLLEGES ─────────────────────────────────────────────
  // Eastern Cape
  { id: "tvet-bcc", name: "Buffalo City TVET College", type: "tvet_college", province: "Eastern Cape", website: "http://www.bccollege.co.za", applicationUrl: "http://www.bccollege.co.za/apply", passRate: 90, minAps: 14, description: "TVET college in East London.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_it] },
  { id: "tvet-ecm", name: "Eastcape Midlands TVET College", type: "tvet_college", province: "Eastern Cape", website: "http://www.emcol.co.za", applicationUrl: "http://www.emcol.co.za", passRate: 90, minAps: 14, description: "Located in Uitenhage.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-ikh", name: "Ikhala TVET College", type: "tvet_college", province: "Eastern Cape", website: "http://www.ikhala.edu.za", applicationUrl: "http://www.ikhala.edu.za", passRate: 90, minAps: 14, description: "Serving the Queenstown area.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_office] },
  { id: "tvet-ing", name: "Ingwe TVET College", type: "tvet_college", province: "Eastern Cape", website: "http://www.ingwecollege.edu.za", applicationUrl: "http://www.ingwecollege.edu.za", passRate: 90, minAps: 14, description: "Serving Mount Frere and surrounds.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_it] },
  { id: "tvet-ks", name: "King Sabata Dalindyebo TVET College", type: "tvet_college", province: "Eastern Cape", website: "http://www.ksdcollege.edu.za", applicationUrl: "http://www.ksdcollege.edu.za", passRate: 90, minAps: 14, description: "Located in Mthatha.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-lov", name: "Lovedale TVET College", type: "tvet_college", province: "Eastern Cape", website: "http://www.lovedale.edu.za", applicationUrl: "http://www.lovedale.edu.za", passRate: 90, minAps: 14, description: "Located in King William's Town.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_it] },
  { id: "tvet-pe", name: "Port Elizabeth TVET College", type: "tvet_college", province: "Eastern Cape", website: "http://www.pecollege.edu.za", applicationUrl: "http://www.pecollege.edu.za", passRate: 90, minAps: 14, description: "Located in Gqeberha.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-khy", name: "King Hintsa TVET College", type: "tvet_college", province: "Eastern Cape", website: "http://www.kinghintsacollege.edu.za", applicationUrl: "http://www.kinghintsacollege.edu.za", passRate: 90, minAps: 14, description: "Located in Butterworth.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },

  // Free State
  { id: "tvet-fla", name: "Flavius Mareka TVET College", type: "tvet_college", province: "Free State", website: "http://www.flaviusmareka.net", applicationUrl: "http://www.flaviusmareka.net", passRate: 90, minAps: 14, description: "Located in Sasolburg.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-gsc", name: "Goldfields TVET College", type: "tvet_college", province: "Free State", website: "http://www.goldfieldstvet.edu.za", applicationUrl: "http://www.goldfieldstvet.edu.za", passRate: 90, minAps: 14, description: "Located in Welkom.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-mrp", name: "Maluti TVET College", type: "tvet_college", province: "Free State", website: "http://www.malutitvet.co.za", applicationUrl: "http://www.malutitvet.co.za", passRate: 90, minAps: 14, description: "Located in Phuthaditjhaba.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },
  { id: "tvet-mot", name: "Motheo TVET College", type: "tvet_college", province: "Free State", website: "http://www.motheotvet.co.za", applicationUrl: "http://www.motheotvet.co.za", passRate: 90, minAps: 14, description: "Located in Bloemfontein.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },

  // Gauteng
  { id: "tvet-cjc", name: "Central Johannesburg TVET College (CJC)", type: "tvet_college", province: "Gauteng", website: "https://www.cjc.edu.za", applicationUrl: "https://www.cjc.edu.za/apply", passRate: 90, minAps: 14, description: "Serving central Joburg.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-eku", name: "Ekurhuleni East TVET College", type: "tvet_college", province: "Gauteng", website: "https://www.eec.edu.za", applicationUrl: "https://www.eec.edu.za", passRate: 90, minAps: 14, description: "Serving Ekurhuleni East.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-ekw", name: "Ekurhuleni West TVET College", type: "tvet_college", province: "Gauteng", website: "https://www.ewc.edu.za", applicationUrl: "https://www.ewc.edu.za", passRate: 90, minAps: 14, description: "Serving Ekurhuleni West.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-sed", name: "Sedibeng TVET College", type: "tvet_college", province: "Gauteng", website: "https://www.sedcol.co.za", applicationUrl: "https://www.sedcol.co.za", passRate: 90, minAps: 14, description: "Serving the Vaal region.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_office] },
  { id: "tvet-swg", name: "South West Gauteng TVET College", type: "tvet_college", province: "Gauteng", website: "https://www.swgc.co.za", applicationUrl: "https://www.swgc.co.za", passRate: 90, minAps: 14, description: "Serving Soweto and surrounds.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus, tvetProgrammes.ncv_it] },
  { id: "tvet-tsn", name: "Tshwane North TVET College", type: "tvet_college", province: "Gauteng", website: "https://www.tnc.edu.za", applicationUrl: "https://www.tnc.edu.za", passRate: 90, minAps: 14, description: "Serving northern Tshwane.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },
  { id: "tvet-tss", name: "Tshwane South TVET College", type: "tvet_college", province: "Gauteng", website: "https://www.tsc.edu.za", applicationUrl: "https://www.tsc.edu.za", passRate: 90, minAps: 14, description: "Serving southern Tshwane.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-wp", name: "Western College (Westcol)", type: "tvet_college", province: "Gauteng", website: "https://www.westcol.co.za", applicationUrl: "https://www.westcol.co.za", passRate: 90, minAps: 14, description: "Serving the West Rand.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },

  // KwaZulu-Natal
  { id: "tvet-amj", name: "Amajuba TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.amajuba.edu.za", applicationUrl: "http://www.amajuba.edu.za", passRate: 90, minAps: 14, description: "Located in Newcastle.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-eln", name: "Elangeni TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.elangeni.edu.za", applicationUrl: "http://www.elangeni.edu.za", passRate: 90, minAps: 14, description: "Located in Pinetown.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-esp", name: "Esayidi TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.esayidifet.co.za", applicationUrl: "http://www.esayidifet.co.za", passRate: 90, minAps: 14, description: "Serving the South Coast.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },
  { id: "tvet-mg", name: "Majuba TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.majuba.edu.za", applicationUrl: "http://www.majuba.edu.za", passRate: 90, minAps: 14, description: "Located in Newcastle.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-mth", name: "Mnambithi TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.mnambithi.edu.za", applicationUrl: "http://www.mnambithi.edu.za", passRate: 90, minAps: 14, description: "Located in Ladysmith.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-mth2", name: "Mthashana TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.mthashanacollege.co.za", applicationUrl: "http://www.mthashanacollege.co.za", passRate: 90, minAps: 14, description: "Located in Vryheid.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },
  { id: "tvet-the", name: "Thekwini TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.thekwini.edu.za", applicationUrl: "http://www.thekwini.edu.za", passRate: 90, minAps: 14, description: "Located in Durban.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-umb", name: "Umfolozi TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.umfolozicollege.co.za", applicationUrl: "http://www.umfolozicollege.co.za", passRate: 90, minAps: 14, description: "Located in Richards Bay.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-umg", name: "Umgungundlovu TVET College", type: "tvet_college", province: "KwaZulu-Natal", website: "http://www.utvet.co.za", applicationUrl: "http://www.utvet.co.za", passRate: 90, minAps: 14, description: "Located in Pietermaritzburg.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },

  // Limpopo
  { id: "tvet-cap", name: "Capricorn TVET College", type: "tvet_college", province: "Limpopo", website: "http://www.capricorncollege.edu.za", applicationUrl: "http://www.capricorncollege.edu.za", passRate: 90, minAps: 14, description: "Located in Polokwane.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-leh", name: "Lephalale TVET College", type: "tvet_college", province: "Limpopo", website: "http://www.leptvetcol.edu.za", applicationUrl: "http://www.leptvetcol.edu.za", passRate: 90, minAps: 14, description: "Located in Lephalale.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-let", name: "Letaba TVET College", type: "tvet_college", province: "Limpopo", website: "http://www.letabatvet.co.za", applicationUrl: "http://www.letabatvet.co.za", passRate: 90, minAps: 14, description: "Located in Tzaneen.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },
  { id: "tvet-mop", name: "Mopani South East TVET College", type: "tvet_college", province: "Limpopo", website: "http://www.mopanicollege.edu.za", applicationUrl: "http://www.mopanicollege.edu.za", passRate: 90, minAps: 14, description: "Located in Phalaborwa.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-sek", name: "Sekhukhune TVET College", type: "tvet_college", province: "Limpopo", website: "http://www.sekfetcol.co.za", applicationUrl: "http://www.sekfetcol.co.za", passRate: 90, minAps: 14, description: "Located in Motetema.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-vhe", name: "Vhembe TVET College", type: "tvet_college", province: "Limpopo", website: "http://www.vhembecollege.edu.za", applicationUrl: "http://www.vhembecollege.edu.za", passRate: 90, minAps: 14, description: "Located in Sibasa.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },
  { id: "tvet-wat", name: "Waterberg TVET College", type: "tvet_college", province: "Limpopo", website: "http://www.waterbergcollege.co.za", applicationUrl: "http://www.waterbergcollege.co.za", passRate: 90, minAps: 14, description: "Located in Mokopane.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },

  // Mpumalanga
  { id: "tvet-eh", name: "Ehlanzeni TVET College", type: "tvet_college", province: "Mpumalanga", website: "http://www.ehlanzenicollege.co.za", applicationUrl: "http://www.ehlanzenicollege.co.za", passRate: 90, minAps: 14, description: "Located in Nelspruit.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-ger", name: "Gert Sibande TVET College", type: "tvet_college", province: "Mpumalanga", website: "http://www.gscollege.co.za", applicationUrl: "http://www.gscollege.co.za", passRate: 90, minAps: 14, description: "Located in Standerton.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-nka", name: "Nkangala TVET College", type: "tvet_college", province: "Mpumalanga", website: "http://www.ntc.edu.za", applicationUrl: "http://www.ntc.edu.za", passRate: 90, minAps: 14, description: "Located in Witbank.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },

  // Northern Cape
  { id: "tvet-nca", name: "Northern Cape Rural TVET College", type: "tvet_college", province: "Northern Cape", website: "http://www.ncrtvet.co.za", applicationUrl: "http://www.ncrtvet.co.za", passRate: 90, minAps: 14, description: "Located in Upington.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-ncu", name: "Northern Cape Urban TVET College", type: "tvet_college", province: "Northern Cape", website: "http://www.ncutvet.edu.za", applicationUrl: "http://www.ncutvet.edu.za", passRate: 90, minAps: 14, description: "Located in Kimberley.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },

  // North West
  { id: "tvet-orbi", name: "Orbit TVET College", type: "tvet_college", province: "North West", website: "http://www.orbitcollege.co.za", applicationUrl: "http://www.orbitcollege.co.za", passRate: 90, minAps: 14, description: "Located in Rustenburg.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-tal", name: "Taletso TVET College", type: "tvet_college", province: "North West", website: "http://www.taletso.edu.za", applicationUrl: "http://www.taletso.edu.za", passRate: 90, minAps: 14, description: "Located in Mahikeng.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-vuse", name: "Vuselela TVET College", type: "tvet_college", province: "North West", website: "http://www.vuselelacollege.co.za", applicationUrl: "http://www.vuselelacollege.co.za", passRate: 90, minAps: 14, description: "Located in Klerksdorp.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },

  // Western Cape
  { id: "tvet-bol", name: "Boland TVET College", type: "tvet_college", province: "Western Cape", website: "http://www.bolandcollege.com", applicationUrl: "http://www.bolandcollege.com", passRate: 90, minAps: 14, description: "Located in Stellenbosch.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-cct", name: "College of Cape Town", type: "tvet_college", province: "Western Cape", website: "http://www.cct.edu.za", applicationUrl: "http://www.cct.edu.za", passRate: 90, minAps: 14, description: "Located in Cape Town.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-fal", name: "False Bay TVET College", type: "tvet_college", province: "Western Cape", website: "http://www.falsebaycollege.co.za", applicationUrl: "http://www.falsebaycollege.co.za", passRate: 90, minAps: 14, description: "Located in Muizenberg.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },
  { id: "tvet-nor", name: "Northlink TVET College", type: "tvet_college", province: "Western Cape", website: "http://www.northlink.co.za", applicationUrl: "http://www.northlink.co.za", passRate: 90, minAps: 14, description: "Located in Bellville.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.nated_bus] },
  { id: "tvet-sou", name: "South Cape TVET College", type: "tvet_college", province: "Western Cape", website: "http://www.sccollege.co.za", applicationUrl: "http://www.sccollege.co.za", passRate: 90, minAps: 14, description: "Located in George.", programmes: [tvetProgrammes.nated_eng, tvetProgrammes.ncv_it] },
  { id: "tvet-wes", name: "West Coast TVET College", type: "tvet_college", province: "Western Cape", website: "http://www.westcoastcollege.co.za", applicationUrl: "http://www.westcoastcollege.co.za", passRate: 90, minAps: 14, description: "Located in Malmesbury.", programmes: [tvetProgrammes.nated_bus, tvetProgrammes.ncv_office] },
];

const VERIFIED_APPLICATION_FEES: Record<string, { amount: number; source: string }> = {
  uct: { amount: 100, source: "https://assets.apply.org.za/u-files/Prospectuses/UCT2026.pdf" },
  wits: { amount: 100, source: "https://www.wits.ac.za/undergraduate/apply-to-wits/" },
  up: { amount: 300, source: "https://www.up.ac.za/online-application/node/37643" },
  su: { amount: 100, source: "https://www.sun.ac.za/english/pgstudies/Documents/How%20to%20pay%20your%20application%20fee.pdf" },
  uj: { amount: 200, source: "https://www.uj.ac.za/about/about/internationalisation/international-students-2/applying-to-uj/" },
  unisa: { amount: 135, source: "https://www.unisa.ac.za/sites/corporate/default/Apply-for-admission" },
};

export function getInstitutionApplicationFee(institution: Institution) {
  if (typeof institution.applicationFee === "number") return institution.applicationFee;
  if (institution.type === "tvet_college") return 0;
  return VERIFIED_APPLICATION_FEES[institution.id]?.amount ?? null;
}

export function getInstitutionApplicationFeeSource(institution: Institution) {
  if (institution.applicationFeeSource) return institution.applicationFeeSource;
  if (institution.type === "tvet_college") return institution.website;
  return VERIFIED_APPLICATION_FEES[institution.id]?.source ?? institution.applicationUrl;
}
