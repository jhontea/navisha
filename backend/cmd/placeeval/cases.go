package main

// area is where a query's right answer lies: a center and a radius in km.
type area struct {
	Lat, Lng float64
	RadiusKm float64
}

// evalQuery is one search a user would type, the point the search is biased
// to (the trip's city), where the answer must be, and, when known exactly,
// the true coordinates.
type evalQuery struct {
	ID    string
	Query string
	Bias  area // search bias; RadiusKm unused
	Area  area // a top result outside this is wrong
	// Category queries ("playground ancol") have no single right name: the
	// top result must be in the area and its name must contain one of these
	// words.
	Category []string
	// Truth is the exact place when known (from a Google Maps link).
	Truth *area
}

var (
	ancol     = area{-6.1225, 106.8420, 4}
	senayan   = area{-6.2185, 106.8020, 4}
	jatiwangi = area{-6.7356, 108.2633, 4}
	cirebon   = area{-6.7063, 108.5570, 8}
	bandung   = area{-6.9175, 107.6191, 8}
	ubud      = area{-8.5069, 115.2625, 6}
	jogja     = area{-7.7956, 110.3695, 6}
)

func within(a area, km float64) area { a.RadiusKm = km; return a }

// Mixed on purpose: a named house, a new venue, hotels, chains, landmarks,
// a street address and category searches, around the cities Navisha trips
// actually go to.
var queries = []evalQuery{
	{ID: "home", Query: "Nanda House", Bias: jatiwangi, Area: within(jatiwangi, 3), Truth: &area{-6.7356034, 108.2632925, 0}},
	{ID: "address", Query: "Jl. Letnan Angkat Arzain No.55 Sutawangi", Bias: jatiwangi, Area: within(jatiwangi, 3)},
	{ID: "venue", Query: "Beach City International Stadium", Bias: ancol, Area: ancol, Truth: &area{-6.1177907, 106.8580394, 0}},
	{ID: "mall", Query: "Ancol Beach City Mall", Bias: ancol, Area: ancol},
	{ID: "hotel-mercure", Query: "Mercure Hotel Ancol", Bias: ancol, Area: ancol},
	{ID: "hotel-dafam", Query: "Grand Dafam Ancol", Bias: ancol, Area: ancol},
	{ID: "park", Query: "Allianz Ecopark Ancol", Bias: ancol, Area: ancol},
	{ID: "resto", Query: "Bandar Djakarta Ancol", Bias: ancol, Area: ancol},
	{ID: "aquarium", Query: "Sea World Ancol", Bias: ancol, Area: ancol},
	{ID: "cat-playground", Query: "playground anak Ancol", Bias: ancol, Area: within(ancol, 6), Category: []string{"playground", "bermain", "kids", "anak", "play"}},
	{ID: "cat-hotel", Query: "hotel dekat Ancol", Bias: ancol, Area: within(ancol, 5), Category: []string{"hotel", "inn", "resort", "suites", "residence"}},
	{ID: "hotel-sawana", Query: "Sawana Suites", Bias: senayan, Area: within(senayan, 5)},
	{ID: "arena", Query: "Tennis Indoor Senayan", Bias: senayan, Area: senayan},
	{ID: "mall-senayan", Query: "Senayan Park", Bias: senayan, Area: senayan},
	{ID: "stadium", Query: "Gelora Bung Karno", Bias: senayan, Area: senayan},
	{ID: "chain", Query: "Kopi Kenangan Senayan", Bias: senayan, Area: senayan},
	{ID: "station", Query: "Stasiun Cirebon", Bias: cirebon, Area: cirebon},
	{ID: "chain-cirebon", Query: "Mie Gacoan Cirebon", Bias: cirebon, Area: within(cirebon, 15)},
	{ID: "airport", Query: "Bandara Kertajati", Bias: jatiwangi, Area: area{-6.6486, 108.1667, 8}},
	{ID: "nature", Query: "Kawah Putih Ciwidey", Bias: bandung, Area: area{-7.1662, 107.4021, 6}},
	{ID: "street", Query: "Jalan Braga Bandung", Bias: bandung, Area: bandung},
	{ID: "cat-cafe", Query: "kafe di Dago Bandung", Bias: bandung, Area: within(bandung, 10), Category: []string{"kafe", "cafe", "coffee", "kopi", "roastery"}},
	{ID: "landmark-bali", Query: "Monkey Forest Ubud", Bias: ubud, Area: ubud},
	{ID: "landmark-jogja", Query: "Malioboro", Bias: jogja, Area: jogja},
}
