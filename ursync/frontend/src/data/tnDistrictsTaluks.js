// src/data/tnDistrictsTaluks.js
//
// Static reference data: every Tamil Nadu district and its taluks.
// Used to power the District / Taluk dropdowns on the "Tenders by
// Location" page so the UI no longer depends on the districts/taluks
// API calls returning in time (or at all).
//
// `id` is a stable slug — pass this to the backend wherever a
// districtId is expected, OR (if your backend expects a Mongo
// ObjectId) match on `name` instead. See note at the bottom of this
// file for how to reconcile the two.

const TN_DISTRICTS_TALUKS = [
  { name: 'Ariyalur', taluks: ['Ariyalur', 'Andimadam', 'Sendurai', 'T. Palur'] },
  { name: 'Chengalpattu', taluks: ['Chengalpattu', 'Thirukalukundram', 'Tambaram', 'Madurantakam', 'Cheyyur', 'Thirupporur', 'Vandalur', 'Pallavaram'] },
  { name: 'Chennai', taluks: ['Egmore', 'Fort Tondiarpet', 'Mambalam Guindy', 'Mylapore Triplicane', 'Purasawalkam', 'Perambur'] },
  { name: 'Coimbatore', taluks: ['Coimbatore North', 'Coimbatore South', 'Mettupalayam', 'Sulur', 'Kinathukadavu', 'Pollachi', 'Valparai', 'Annur', 'Perur', 'Madukkarai'] },
  { name: 'Cuddalore', taluks: ['Cuddalore', 'Chidambaram', 'Kattumannarkoil', 'Kurinjipadi', 'Panruti', 'Srimushnam', 'Titagudi', 'Vridhachalam', 'Bhuvanagiri', 'Veppur', 'Mangalore', 'Nallur'] },
  { name: 'Dharmapuri', taluks: ['Dharmapuri', 'Harur', 'Karimangalam', 'Nallampalli', 'Palacode', 'Pappireddipatti', 'Pennagaram'] },
  { name: 'Dindigul', taluks: ['Dindigul', 'Athoor', 'Batlagundu', 'Guziliyamparai', 'Kodaikanal', 'Natham', 'Nilakottai', 'Oddanchatram', 'Palani', 'Vedasandur'] },
  { name: 'Erode', taluks: ['Erode', 'Anthiyur', 'Bhavani', 'Gobichettipalayam', 'Kodumudi', 'Modakurichi', 'Nambiyur', 'Perundurai', 'Sathyamangalam', 'Talavadi', 'Thalavadi', 'Ammapettai'] },
  { name: 'Kallakurichi', taluks: ['Kallakurichi', 'Chinnasalem', 'Sankarapuram', 'Tirukoilur', 'Ulundurpet', 'Kalvarayan Hills'] },
  { name: 'Kancheepuram', taluks: ['Kancheepuram', 'Sriperumbudur', 'Uthiramerur', 'Walajabad'] },
  { name: 'Kanniyakumari', taluks: ['Agastheeswaram', 'Kalkulam', 'Thovalai', 'Vilavancode', 'Killiyoor'] },
  { name: 'Karur', taluks: ['Karur', 'Aravakurichi', 'Kadavur', 'Krishnarayapuram', 'Kulithalai', 'Manmangalam', 'Pugalur'] },
  { name: 'Krishnagiri', taluks: ['Krishnagiri', 'Bargur', 'Hosur', 'Kaveripattinam', 'Pochampalli', 'Shoolagiri', 'Uthangarai', 'Denkanikottai'] },
  { name: 'Madurai', taluks: ['Madurai North', 'Madurai South', 'Madurai East', 'Madurai West', 'Melur', 'Peraiyur', 'Thirumangalam', 'Thirupparankundram', 'Usilampatti', 'Vadipatti', 'Kalligudi', 'Sedapatti'] },
  { name: 'Mayiladuthurai', taluks: ['Mayiladuthurai', 'Sirkazhi', 'Tharangambadi', 'Kuthalam'] },
  { name: 'Nagapattinam', taluks: ['Nagapattinam', 'Kilvelur', 'Vedaranyam', 'Thirukkuvalai'] },
  { name: 'Namakkal', taluks: ['Namakkal', 'Kolli Hills', 'Kumarapalayam', 'Mohanur', 'Paramathi Velur', 'Rasipuram', 'Sendamangalam', 'Tiruchengode'] },
  { name: 'Nilgiris', taluks: ['Udhagamandalam (Ooty)', 'Coonoor', 'Kotagiri', 'Gudalur', 'Pandalur'] },
  { name: 'Perambalur', taluks: ['Perambalur', 'Kunnam', 'Veppanthattai', 'Alathur'] },
  { name: 'Pudukkottai', taluks: ['Pudukkottai', 'Alangudi', 'Aranthangi', 'Avudaiyarkoil', 'Gandarvakottai', 'Illuppur', 'Karambakudi', 'Kulathur', 'Manamelkudi', 'Ponnamaravathi', 'Thirumayam', 'Viralimalai'] },
  { name: 'Ramanathapuram', taluks: ['Ramanathapuram', 'Kadaladi', 'Kamuthi', 'Mudukulathur', 'Paramakudi', 'Rajasingamangalam', 'Rameswaram', 'Tiruvadanai', 'Kadaladi'] },
  { name: 'Ranipet', taluks: ['Ranipet', 'Arakkonam', 'Arcot', 'Nemili', 'Sholinghur', 'Walajapet'] },
  { name: 'Salem', taluks: ['Salem', 'Attur', 'Edappadi', 'Gangavalli', 'Kadayampatti', 'Mettur', 'Omalur', 'Sankari', 'Vazhapadi', 'Yercaud', 'Pethanaickenpalayam'] },
  { name: 'Sivaganga', taluks: ['Sivaganga', 'Devakottai', 'Ilayangudi', 'Kalaiyarkoil', 'Manamadurai', 'Singampunari', 'Thiruppuvanam', 'Tirupathur'] },
  { name: 'Tenkasi', taluks: ['Tenkasi', 'Alangulam', 'Kadayanallur', 'Sankarankovil', 'Shenkottai', 'Sivagiri', 'Vasudevanallur', 'Veerakeralampudur'] },
  { name: 'Thanjavur', taluks: ['Thanjavur', 'Boothalur', 'Kumbakonam', 'Orathanadu', 'Papanasam', 'Pattukkottai', 'Peravurani', 'Thiruvaiyaru', 'Thiruvidaimarudur'] },
  { name: 'Theni', taluks: ['Theni', 'Andipatti', 'Bodinayakanur', 'Periyakulam', 'Uthamapalayam'] },
  { name: 'Thoothukudi', taluks: ['Thoothukudi', 'Eral', 'Ettayapuram', 'Kayathar', 'Kovilpatti', 'Ottapidaram', 'Sathankulam', 'Srivaikuntam', 'Tiruchendur', 'Vilathikulam'] },
  { name: 'Tiruchirappalli', taluks: ['Tiruchirappalli East', 'Tiruchirappalli West', 'Lalgudi', 'Manachanallur', 'Manapparai', 'Musiri', 'Srirangam', 'Thottiyam', 'Thuraiyur', 'Thiruverumbur'] },
  { name: 'Tirunelveli', taluks: ['Tirunelveli', 'Ambasamudram', 'Cheranmahadevi', 'Nanguneri', 'Palayamkottai', 'Radhapuram', 'Sankarnagar'] },
  { name: 'Tirupathur', taluks: ['Tirupathur', 'Ambur', 'Natrampalli', 'Vaniyambadi'] },
  { name: 'Tiruppur', taluks: ['Tiruppur North', 'Tiruppur South', 'Avinashi', 'Dharapuram', 'Kangayam', 'Madathukulam', 'Palladam', 'Udumalpet', 'Uthukuli'] },
  { name: 'Tiruvallur', taluks: ['Tiruvallur', 'Gummidipoondi', 'Poonamallee', 'Ponneri', 'Pallipattu', 'R.K. Pet', 'Tiruttani', 'Uthukottai', 'Avadi'] },
  { name: 'Tiruvannamalai', taluks: ['Tiruvannamalai', 'Arni', 'Chengam', 'Cheyyar', 'Chetpet', 'Kalasapakkam', 'Kilpennathur', 'Polur', 'Vandavasi', 'Vembakkam'] },
  { name: 'Tiruvarur', taluks: ['Tiruvarur', 'Kudavasal', 'Mannargudi', 'Nannilam', 'Needamangalam', 'Thiruthuraipoondi', 'Valangaiman'] },
  { name: 'Vellore', taluks: ['Vellore', 'Anaicut', 'Gudiyatham', 'K.V. Kuppam', 'Katpadi'] },
  { name: 'Viluppuram', taluks: ['Viluppuram', 'Gingee', 'Kandachipuram', 'Marakkanam', 'Melmalayanur', 'Tindivanam', 'Vanur', 'Vikravandi'] },
  { name: 'Virudhunagar', taluks: ['Virudhunagar', 'Aruppukkottai', 'Kariapatti', 'Rajapalayam', 'Sattur', 'Sivakasi', 'Srivilliputhur', 'Tiruchuli', 'Vembakottai', 'Watrap'] },
]

// Slugify a district name into a stable, URL/id-safe key, e.g.
// "Kanniyakumari" -> "kanniyakumari", "Ranipet" -> "ranipet"
export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Convenience: [{ id, name }] shape the district dropdown wants.
export const TN_DISTRICTS = TN_DISTRICTS_TALUKS.map((d) => ({
  id: slugify(d.name),
  name: d.name,
}))

// Convenience: { [districtId]: string[] } lookup for taluks by district id.
export const TN_TALUKS_BY_DISTRICT_ID = TN_DISTRICTS_TALUKS.reduce((acc, d) => {
  acc[slugify(d.name)] = d.taluks
  return acc
}, {})

// Convenience: { [districtName]: string[] } lookup for taluks by district name,
// useful if your backend's districtId is a Mongo ObjectId rather than a slug —
// in that case, match districts by `name` against your District collection
// instead of relying on the slug id.
export const TN_TALUKS_BY_DISTRICT_NAME = TN_DISTRICTS_TALUKS.reduce((acc, d) => {
  acc[d.name] = d.taluks
  return acc
}, {})

export default TN_DISTRICTS_TALUKS