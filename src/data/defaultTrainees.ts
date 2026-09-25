import { TraineeProfile } from '../types';

// List of realistic profile pictures (professional, diverse portraits)
const AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=120&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=120&auto=format&fit=crop'
];

export interface RawEmployee {
  emId: string;
  name: string;
  dept: string;
  group: string;
}

// 155 real employees extracted from the provided excel sheet of Da Tian Footwear Plant
export const rawEmployees: RawEmployee[] = [
  { emId: "DT-001", name: "Vergara, Charlyn, Arellano", dept: "Stitching A8", group: "Stitching A" },
  { emId: "P30075", name: "Antipuesto, Lea Ann, Nacar", dept: "Stitching A10", group: "Stitching A" },
  { emId: "P30818", name: "Coloma, Regine, Aropo", dept: "Stitching B1", group: "Stitching B" },
  { emId: "P31107", name: "Canaveral, Edward, Bantayan", dept: "Stitching B8", group: "Stitching B" },
  { emId: "P30497", name: "Gonzales, Jovefrey, Ancho", dept: "Stitching B13", group: "Stitching B" },
  { emId: "P30606", name: "Pangilinan, Antonette, Chavez", dept: "Stitching B2", group: "Stitching B" },
  { emId: "DT-007", name: "Modelo, Mary Ann, Mendigorin", dept: "Stitching B20", group: "Stitching B" },
  { emId: "DT-008", name: "Turalba, Nikko, Alaal", dept: "Stitching B19", group: "Stitching B" },
  { emId: "PN1171", name: "Del Rosario, Alyssa, Talapiero", dept: "Stitching Punching B", group: "Stitching B" },
  { emId: "P30519", name: "Marchan, Vanessa, Compoto", dept: "Stitching B18", group: "Stitching B" },
  { emId: "DT-011", name: "Villaran, Analisa, Mapa", dept: "Stitching A11", group: "Stitching A" },
  { emId: "PN1156", name: "Dela Cruz, Jerycho, Asesor", dept: "Stitching A21", group: "Stitching A" },
  { emId: "DT-013", name: "Nacar, Jenie", dept: "Stitching A15", group: "Stitching A" },
  { emId: "P30892", name: "Loyola, Jinky, Marinas", dept: "Stitching A11", group: "Stitching A" },
  { emId: "P30128", name: "Dela Cruz, Irish Joyce, Jao", dept: "Assembly A13", group: "Stitching A" },
  { emId: "P30868", name: "Gabot, Maila, Asuncion", dept: "Stitching A19", group: "Stitching A" },
  { emId: "DT-017", name: "Ramos, Diana, Escultor", dept: "Stitching B21", group: "Stitching B" },
  { emId: "P30627", name: "De Guzman, May, Perez", dept: "Stitching B15", group: "Stitching B" },
  { emId: "P30707", name: "Garcia, Cristina, Encabo", dept: "Stitching B5", group: "Stitching B" },
  { emId: "DT-020", name: "Valdez, Majee Lyn, Rufino", dept: "Stitching A6", group: "Stitching A" },
  { emId: "DT-021", name: "Moral, Kristel, Pena", dept: "Stitching B4", group: "Stitching B" },
  { emId: "DT-022", name: "Sotto, Estrella, Hachaso", dept: "Stitching B17", group: "Stitching B" },
  { emId: "DT-023", name: "Vito Cruz, Jessie, Lorque", dept: "Stitching B14", group: "Stitching B" },
  { emId: "PN2086", name: "Costales, Ned Nixon, Quiambao", dept: "Stitching B10", group: "Stitching B" },
  { emId: "P30871", name: "Edanol, Cynthia, Ursua", dept: "Stitching B10", group: "Stitching B" },
  { emId: "P30012", name: "Peralta, Michelle, Meron", dept: "Stitching B9", group: "Stitching B" },
  { emId: "P30467", name: "Cabe, Marivic, Sumatra", dept: "Stitching B6", group: "Stitching B" },
  { emId: "T30099", name: "Manglicmot, Joy", dept: "Stitching D7", group: "Stitching D" },
  { emId: "DT-029", name: "Atanacio, Metosela", dept: "Stitching D8", group: "Stitching D" },
  { emId: "DT-030", name: "Valerio, Joana, Balingit", dept: "Stitching D13", group: "Stitching D" },
  { emId: "T30347", name: "Garlota, Arlene, Lansang", dept: "Stitching D16", group: "Stitching D" },
  { emId: "DT-032", name: "Noya, Edwin, Mahinay", dept: "Stitching E12", group: "Stitching E" },
  { emId: "DT-033", name: "Nazar, Sheila May, Oguis", dept: "Stitching E12", group: "Stitching E" },
  { emId: "T30416", name: "Gaces, Quennie Pearl, Reyes", dept: "Stitching E6", group: "Stitching E" },
  { emId: "T30537", name: "Kumar, Manpreet Kuar, Miano", dept: "Stitching E6", group: "Stitching E" },
  { emId: "T30568", name: "Engcoy, Mary Cristel Ann, Ramirez", dept: "Stitching E8", group: "Stitching E" },
  { emId: "T30415", name: "Garcia, Samantha, Imasa", dept: "Stitching E2", group: "Stitching E" },
  { emId: "T30601", name: "Gallardo, Jay Cris, Eclevia", dept: "Stitching D18", group: "Stitching D" },
  { emId: "T30049", name: "Famularcano, Jhonnie, Tolentino", dept: "Stitching D12", group: "Stitching D" },
  { emId: "DT-040", name: "Rivera, Jonita Loli, Figuerres", dept: "Stitching D17", group: "Stitching D" },
  { emId: "T30077", name: "Andrino, Angelie", dept: "Stitching D1", group: "Stitching D" },
  { emId: "DT-042", name: "Orpilla, Jinky Jane, Cedeno", dept: "Stitching D2", group: "Stitching D" },
  { emId: "TN0198", name: "Chua, Aaron Paul, Tutanes", dept: "Stitching D14", group: "Stitching D" },
  { emId: "DT-044", name: "Palacios, Armina, Ortega", dept: "Stitching D14", group: "Stitching D" },
  { emId: "DT-045", name: "Mendigorin, Jessica, Ragadio", dept: "Stitching D6", group: "Stitching D" },
  { emId: "DT-046", name: "Roldan, Mary Lour", dept: "Stitching D5", group: "Stitching D" },
  { emId: "T20150", name: "Bernabe, Ruel, Romerosa", dept: "Cutting Preparation Group", group: "Cutting" },
  { emId: "DT-048", name: "Valentino, Thalia, De Castro", dept: "Cutting Component", group: "Cutting" },
  { emId: "P20117", name: "Aguilo, John Edralyn, Agaton", dept: "Cutting Group B", group: "Cutting Preparation B" },
  { emId: "P20121", name: "Mananquil, Jeniffer, Mangiral", dept: "Cutting Group A", group: "Cutting A" },
  { emId: "P20141", name: "Delelis, Krystelyn, Anastacio", dept: "Cutting Group B", group: "Cutting B" },
  { emId: "P20230", name: "Padilla, Phoebe, Martinez", dept: "Cutting Auto Machine", group: "Cutting B" },
  { emId: "P40052", name: "Castillo, Jeeza, NMN", dept: "Assembly B8", group: "Assembly B" },
  { emId: "P40057", name: "Etio, Kyrie Elleison, Baylen", dept: "Assembly B6", group: "Assembly B" },
  { emId: "P50091", name: "Dalanon, Carlo, Mapa", dept: "Rubber Preparation", group: "DTP Rubber" },
  { emId: "DT-056", name: "Warag, Rowena, Sag -Od", dept: "Assembly B7", group: "Assembly B" },
  { emId: "P40955", name: "Malinao, John Philip, Taneo", dept: "Assembly B10", group: "Assembly B" },
  { emId: "DT-058", name: "Rabago, Jomari, Dumanay", dept: "Assembly B5", group: "Assembly B" },
  { emId: "DT-059", name: "Sindingan, Roberto, Flores", dept: "Auto-Cutting Group", group: "Cutting" },
  { emId: "P20096", name: "Banugon, Lories, Estrada", dept: "Cutting Group B", group: "Cutting B" },
  { emId: "P20221", name: "Chico, Ellena, Abungin", dept: "Cutting Group B", group: "Cutting B" },
  { emId: "P20334", name: "Conde, Jennifer, Rapado", dept: "Cutting Group A", group: "Cutting A" },
  { emId: "DT-063", name: "Viray, Jemuel, Canto", dept: "Assembly B6", group: "Assembly B" },
  { emId: "P41412", name: "Labandelo, Marlon Darell, Turalba", dept: "Assembly B8", group: "Assembly B" },
  { emId: "DT-065", name: "Tapispisan, Mark Christian, Nmn", dept: "Assembly B6", group: "Assembly B" },
  { emId: "PN0028", name: "Ignisaban Jr., Isagani, Dechosa", dept: "Assembly A8", group: "Assembly A" },
  { emId: "P30265", name: "Alvarez, Rosalyn, De Vera", dept: "Stitching B16", group: "Stitching B" },
  { emId: "DT-068", name: "Perdez, Aiza, Partosa", dept: "Stitching B9", group: "Stitching B" },
  { emId: "P30373", name: "Fallorin, Mae Ann, Carreon", dept: "Stitching B7", group: "Stitching B" },
  { emId: "DT-070", name: "Valerio, Joana, Balingit", dept: "Stitching D13", group: "Stitching D" },
  { emId: "P30281", name: "Inson, Windle Jane, Francisco", dept: "Stitching B18", group: "Stitching B" },
  { emId: "T30114", name: "Crobalde, Jedilyn, Mistica", dept: "Stitching D11", group: "Stitching D" },
  { emId: "DT-073", name: "Reyes, Christine Ella", dept: "Stitching B4", group: "Stitching B" },
  { emId: "DT-074", name: "Reyes, Jhon Wilmark, Magana", dept: "Stitching B22", group: "Stitching B" },
  { emId: "P40668", name: "Ceriales, Rechelle", dept: "Assembly B8", group: "Assembly B" },
  { emId: "PN0374", name: "Barrozo, Analou, Alarma", dept: "Stitching B3", group: "Stitching B" },
  { emId: "DT-078", name: "Ceriales, Rechelle", dept: "Assembly B8", group: "Assembly B" },
  { emId: "P40231", name: "Avelino, Mary Grace, Ag-ag", dept: "Assembly B6", group: "Assembly B" },
  { emId: "P41435", name: "Formalejo, Edmar, Candido", dept: "Assembly B6", group: "Assembly B" },
  { emId: "P40808", name: "Aldas, Divine", dept: "Assembly B13", group: "Assembly B" },
  { emId: "P40090", name: "Bordeos, Joshua, Felarca", dept: "Assembly B13", group: "Assembly B" },
  { emId: "P40849", name: "Becerro, Rima", dept: "Assembly B10", group: "Assembly B" },
  { emId: "P40773", name: "Macalino, Sheryl, Bondal", dept: "Assembly A12", group: "Assembly A" },
  { emId: "PN1619", name: "Arnosa, Jomari, Colo", dept: "Stitching B21", group: "Stitching B" },
  { emId: "DT-086", name: "Rovelyn Camosa", dept: "Stitching A5", group: "Stitching A" },
  { emId: "DT-087", name: "Natilen Crobalde", dept: "Stitching A7", group: "Stitching A" },
  { emId: "DT-088", name: "Jayzel Marie Rabara", dept: "Stitching A8", group: "Stitching A" },
  { emId: "DT-089", name: "Hidee Mae L. Madamba", dept: "Stitching A11", group: "Stitching A" },
  { emId: "DT-090", name: "Andrea Rosimo", dept: "Stitching A12", group: "Stitching A" },
  { emId: "DT-091", name: "Divina Maynigo", dept: "Stitching A13", group: "Stitching A" },
  { emId: "DT-092", name: "Lindy Soon", dept: "Stitching A15", group: "Stitching A" },
  { emId: "DT-093", name: "Julina Domacilla", dept: "Stitching A16", group: "Stitching A" },
  { emId: "DT-094", name: "Dennison De guzman", dept: "Stitching A16", group: "Stitching A" },
  { emId: "DT-095", name: "Pauline Bosch", dept: "Stitching A17", group: "Stitching A" },
  { emId: "DT-096", name: "Emy Salazar", dept: "Stitching A19", group: "Stitching A" },
  { emId: "DT-097", name: "Hynah Lagarteja", dept: "Stitching A20", group: "Stitching A" },
  { emId: "DT-098", name: "Joseph Dolueras", dept: "Stitching A22", group: "Stitching A" },
  { emId: "DT-099", name: "Miano, John Mark, Melu", dept: "Stitching B8", group: "Stitching B" },
  { emId: "DT-100", name: "De Galicia, Bea, Baliguat", dept: "Stitching B10", group: "Stitching B" },
  { emId: "DT-101", name: "Ortaleza, Hazel Joy, Matias", dept: "Stitching B11", group: "Stitching B" },
  { emId: "DT-102", name: "Calimlim, Christine Marie, Valdori", dept: "Stitching B15", group: "Stitching B" },
  { emId: "DT-103", name: "Jophet Monsales", dept: "Assembly A / Vulcanizing", group: "Assembly A" },
  { emId: "DT-104", name: "Abitan, Harold Ian, Basa", dept: "Midsole Cutting", group: "Assembly A" },
  { emId: "DT-105", name: "Martinez, Jackelyn, Buendia", dept: "Assembly Midsole Print", group: "Assembly A" },
  { emId: "DT-106", name: "Racoma, Rose Ann", dept: "Assembly Midsole", group: "Assembly A" },
  { emId: "DT-107", name: "Bathan, Leslie Ann, Philips", dept: "Assembly Chemical A", group: "Assembly A" },
  { emId: "DT-108", name: "Serato, Ginaluz, Bonifacio", dept: "Assembly A3", group: "Assembly A" },
  { emId: "DT-109", name: "Albor, Gio, Metran", dept: "Assembly A", group: "Assembly A" },
  { emId: "DT-110", name: "Bolante, Joefel, Minieda", dept: "Assembly A4", group: "Assembly A" },
  { emId: "DT-111", name: "Dela Cruz, Archie, Cordeta", dept: "Assembly A5", group: "Assembly A" },
  { emId: "DT-112", name: "Corpuz, Baby Ruth, Ortaliz", dept: "Assembly A6", group: "Assembly A" },
  { emId: "DT-113", name: "Lea Fabros", dept: "Assembly A10", group: "Assembly A" },
  { emId: "DT-114", name: "Manglicmot, Christian love, Tapisp", dept: "Assembly B2", group: "Assembly B" },
  { emId: "DT-115", name: "Ma. Cristina, Macam", dept: "Assembly B6", group: "Assembly B" },
  { emId: "DT-116", name: "Etio, Kyrie Elleison, Baylen", dept: "Assembly B9", group: "Assembly B" },
  { emId: "DT-117", name: "Panuelos, Jomar, Matario", dept: "Assembly B11", group: "Assembly B" },
  { emId: "DT-118", name: "Romel, Mobley", dept: "Assembly B11", group: "Assembly B" },
  { emId: "DT-119", name: "Mandia, Christian, Castro", dept: "Assembly B12", group: "Assembly B" },
  { emId: "DT-120", name: "Ceriales, Rechelle", dept: "Assembly B12", group: "Assembly B" },
  { emId: "DT-121", name: "Noel Galindo", dept: "Shoe Last", group: "Assembly A" },
  { emId: "DT-122", name: "Moya, Sheenalyn, Solis", dept: "Assembly B12", group: "Assembly B" },
  { emId: "DT-123", name: "Ramon, Dela Cruz", dept: "Rubber Extrusion Group", group: "DTP Rubber" },
  { emId: "DT-124", name: "Bansil, Goldwyn, Leona", dept: "Rubber Milling Group", group: "DTP Rubber" },
  { emId: "DT-125", name: "Tec, Maria Isabel", dept: "Stitching D3", group: "Stitching D" },
  { emId: "DT-126", name: "Lonzanida, Jomarie, Fabricante", dept: "Stitching D4", group: "Stitching D" },
  { emId: "DT-127", name: "Roldan, Mary Lour, Landeza", dept: "Stitching D5", group: "Stitching D" },
  { emId: "DT-128", name: "Averhart, Margie, Imperial", dept: "Stitching D6", group: "Stitching D" },
  { emId: "DT-129", name: "Marilou Paras", dept: "Stitching D9", group: "Stitching D" },
  { emId: "DT-130", name: "Banzuelo, Maricel, Tubar", dept: "Stitching D10", group: "Stitching D" },
  { emId: "DT-131", name: "Balagot, Rachelle", dept: "Stitching D11", group: "Stitching D" },
  { emId: "DT-132", name: "Roca, Patricia, Go", dept: "Stitching D11", group: "Stitching D" },
  { emId: "DT-133", name: "Parayno, Arjay, Lomibao", dept: "Stitching D14", group: "Stitching D" },
  { emId: "DT-134", name: "Acera, Vicbeth, Ruiz", dept: "Stitching E02", group: "Stitching E" },
  { emId: "DT-135", name: "Viñas, Abby, De Guzman", dept: "Stitching E02", group: "Stitching E" },
  { emId: "DT-136", name: "Bañez, Christine Ann, Rios", dept: "Stitching E03", group: "Stitching E" },
  { emId: "DT-137", name: "Yumague, Leonna Jane, Tinambac", dept: "Stitching E03", group: "Stitching E" },
  { emId: "DT-138", name: "Abad, Crystal Ann, Saludez", dept: "Stitching E05", group: "Stitching E" },
  { emId: "DT-139", name: "Rosales, Merrylie", dept: "Stitching E06", group: "Stitching E" },
  { emId: "DT-140", name: "Arabejo, Leanna Mae", dept: "Stitching E07", group: "Stitching E" },
  { emId: "DT-141", name: "Delos Santos, Julius", dept: "Stitching E07", group: "Stitching E" },
  { emId: "DT-142", name: "Marquez, Vanessa", dept: "Stitching E08", group: "Stitching E" },
  { emId: "DT-143", name: "Caras, Justin, Banal", dept: "Stitching E09", group: "Stitching E" },
  { emId: "DT-144", name: "Daguman, Vanesa, Ibañez", dept: "Stitching E10", group: "Stitching E" },
  { emId: "DT-145", name: "Rafanan, Blodimer, Custodio", dept: "Stitching E10", group: "Stitching E" },
  { emId: "DT-146", name: "Ramos, Airanne Joy", dept: "Stitching E11", group: "Stitching E" },
  { emId: "DT-147", name: "Espinosa, Jeffrey, Balazon", dept: "Stitching E11", group: "Stitching E" },
  { emId: "DT-148", name: "Osiang, Mariane, Dilig", dept: "Stitching E11", group: "Stitching E" },
  { emId: "DT-149", name: "Pedro, Glory Ann, Adama", dept: "Stitching E12", group: "Stitching E" },
  { emId: "DT-150", name: "Mabini, Emmanuela, Borja", dept: "Stitching E12", group: "Stitching E" },
  { emId: "DT-151", name: "Galera, Fewnna, Calinawan", dept: "Stitching E13", group: "Stitching E" },
  { emId: "DT-152", name: "Sedantes, Althea Jane", dept: "Stitching E10", group: "Stitching E" },
  { emId: "DT-153", name: "Melanio, Jerald", dept: "Rubber Extruding Group", group: "DTP Rubber" },
  { emId: "DT-154", name: "Leah Pilapil", dept: "Stitching E13", group: "Stitching E" },
  { emId: "DT-155", name: "Valine, Aricite", dept: "Punching", group: "Stitching" },
  { emId: "DT-156", name: "Jimuel, Mojeca", dept: "Stitching E5", group: "Stitching E" }
];

// Helper to determine role or position based on department classification
function getPosition(dept: string): string {
  const dLow = dept.toLowerCase();
  if (dLow.includes('stitching')) {
    if (dLow.includes('punching')) return 'Stitching & Punching Operator';
    return 'Stitching Operator';
  }
  if (dLow.includes('cutting')) {
    if (dLow.includes('preparation')) return 'Cutting Material Arranger';
    if (dLow.includes('auto')) return 'Automatic Cutting Specialist';
    return 'Component Cutter';
  }
  if (dLow.includes('assembly')) {
    if (dLow.includes('midsole')) return 'Midsole Assembler';
    if (dLow.includes('chemical')) return 'Adhesives Specialist';
    if (dLow.includes('vulcaniz')) return 'Vulcanizing Specialist';
    return 'Line Assembler';
  }
  if (dLow.includes('rubber')) {
    if (dLow.includes('extrusion') || dLow.includes('extruding')) return 'Rubber Extrusion Tech';
    if (dLow.includes('milling')) return 'Rubber Milling Operator';
    return 'Rubber Prep Operator';
  }
  if (dLow.includes('punching')) return 'Punching Operator';
  if (dLow.includes('shoe last')) return 'Shoe Lasting Tech';
  return 'Production Operator';
}

// Generate high-fidelity trainee profiles
export const DEFAULT_TRAINEES: TraineeProfile[] = rawEmployees.map((emp, i) => {
  const REQUIRED_SUBJECTS = [
    { name: 'Machine Maintenance and Safety', trainer: 'Elena Torres', date: '2026-01-15', remarksComp: 'Passed equipment safety assessment and routine checks.', remarksOng: 'Practical machinery safety demonstration in progress.' },
    { name: 'Basic Quality Concept', trainer: 'John Smith', date: '2026-02-05', remarksComp: 'Demonstrated precise Quality Control measurement compliance.', remarksOng: 'Assigned quality metrics modules ongoing.' },
    { name: 'Line Balancing', trainer: 'Elena Torres', date: '2026-02-28', remarksComp: 'Completed line efficiency optimization modules.', remarksOng: 'Reviewing stitching throughput and cell layout studies.' },
    { name: 'Style Change Management', trainer: 'John Smith', date: '2026-03-12', remarksComp: 'Acquired style-over crossover checklists and quick setups.', remarksOng: 'Active workshop on style transfer timing.' },
    { name: 'Effective Communication', trainer: 'Elena Torres', date: '2026-04-02', remarksComp: 'Passed active listening and supervisor feedback exercises.', remarksOng: 'Reviewing cross-departmental communications.' },
    { name: 'Team and Management', trainer: 'Elena Torres', date: '2026-04-20', remarksComp: 'Exhibited proactive line leadership qualities.', remarksOng: 'Group coordination practices ongoing.' },
    { name: '6S Management', trainer: 'John Smith', date: '2026-05-10', remarksComp: 'Successfully certified in deep cleaning & sorting audits.', remarksOng: 'Analyzing shop floor layout under 6S.' },
    { name: 'Human Resources Management', trainer: 'Elena Torres', date: '2026-05-22', remarksComp: 'Passed compliance training on labor guidelines and roster scheduling.', remarksOng: 'Exploring employee onboarding rules.' }
  ];

  const completedCount = (i % 3) + 5; // 5, 6, or 7 completed
  const ongoingCount = (i % 2) + 1; // 1 or 2 ongoing

  const subjects = REQUIRED_SUBJECTS.map((subj, sIdx) => {
    let status: 'Completed' | 'On-going' | 'Not yet started' = 'Not yet started';
    let remarks = 'Waiting for scheduling slot.';
    
    if (sIdx < completedCount) {
      status = 'Completed';
      remarks = subj.remarksComp;
    } else if (sIdx < completedCount + ongoingCount && sIdx < 8) {
      status = 'On-going';
      remarks = subj.remarksOng;
    }

    return {
      id: `SUB-${emp.emId}-${sIdx + 1}`,
      subjectName: subj.name,
      date: subj.date,
      trainerName: subj.trainer,
      status,
      remarks,
      attendance: 'Present' as const,
      timestamp: new Date(subj.date).toISOString()
    };
  });

  return {
    id: `TRN-${emp.emId}-${i}`,
    name: emp.name,
    employeeId: emp.emId,
    department: emp.dept,
    position: getPosition(emp.dept),
    dateStarted: `2025-05-${(10 + (i % 20)).toString().padStart(2, '0')}`,
    photoUrl: AVATARS[i % AVATARS.length],
    subjects,
    auditLogs: [
      {
        id: `LOG-${emp.emId}-${i}`,
        action: 'Authorized system profile load from official Da Tian Excel spreadsheet roster.',
        timestamp: 'May 01, 25, 08:00 AM',
        user: 'Active Auditor'
      }
    ]
  };
});
