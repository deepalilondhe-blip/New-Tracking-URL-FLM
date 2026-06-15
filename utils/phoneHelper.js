const stateAreaCodes = {
  "Alabama": ["205", "251", "256", "334", "938"],
  "Alaska": ["907"],
  "Arizona": ["480", "520", "602", "623", "928"],
  "Arkansas": ["479", "501", "870"],
  "California": ["209", "213", "310", "323", "408", "415", "510", "530", "559", "562", "619", "626", "650", "661", "707", "714", "760", "805", "818", "831", "858", "909", "916", "925", "949", "951"],
  "Colorado": ["303", "719", "970", "720"],
  "Connecticut": ["203", "860", "475", "959"],
  "Delaware": ["302"],
  "Florida": ["239", "305", "321", "352", "386", "407", "561", "727", "754", "772", "786", "813", "850", "863", "904", "941", "954"],
  "Georgia": ["229", "404", "470", "478", "678", "706", "762", "770", "912"],
  "Hawaii": ["808"],
  "Idaho": ["208"],
  "Illinois": ["217", "309", "312", "618", "630", "708", "773", "815", "847"],
  "Indiana": ["219", "260", "317", "574", "765", "812"],
  "Iowa": ["319", "515", "563", "641", "712"],
  "Kansas": ["316", "620", "785", "913"],
  "Kentucky": ["270", "502", "606", "859"],
  "Louisiana": ["225", "318", "337", "504", "985"],
  "Maine": ["207"],
  "Maryland": ["301", "410", "443"],
  "Massachusetts": ["413", "508", "617", "781", "978"],
  "Michigan": ["231", "248", "269", "313", "517", "586", "616", "734", "810", "906", "989"],
  "Minnesota": ["218", "320", "507", "612", "651", "763", "952"],
  "Mississippi": ["601", "662", "769"],
  "Missouri": ["314", "417", "573", "636", "660", "816"],
  "Montana": ["406"],
  "Nebraska": ["308", "402", "531"],
  "Nevada": ["702", "775"],
  "New Hampshire": ["603"],
  "New Jersey": ["201", "551", "609", "732", "848", "856", "862", "908", "973"],
  "New Mexico": ["505", "575"],
  "New York": ["212", "315", "516", "518", "607", "631", "716", "718", "845", "914", "917"],
  "North Carolina": ["252", "336", "704", "828", "910", "919", "980"],
  "North Dakota": ["701"],
  "Ohio": ["216", "330", "419", "440", "513", "614", "740", "937"],
  "Oklahoma": ["405", "580", "918"],
  "Oregon": ["503", "541", "971"],
  "Pennsylvania": ["215", "267", "412", "484", "570", "610", "717", "724", "814"],
  "Rhode Island": ["401"],
  "South Carolina": ["803", "843", "864"],
  "South Dakota": ["605"],
  "Tennessee": ["423", "615", "731", "865", "901", "931"],
  "Texas": ["210", "214", "254", "281", "325", "361", "409", "469", "512", "713", "806", "817", "830", "832", "903", "915", "936", "940", "956", "972", "979"],
  "Utah": ["385", "435", "801"],
  "Vermont": ["802"],
  "Virginia": ["276", "434", "540", "703", "757", "804"],
  "Washington": ["206", "253", "360", "425", "509"],
  "West Virginia": ["304", "681"],
  "Wisconsin": ["262", "414", "608", "715", "920"],
  "Wyoming": ["307"]
};

const codeToState = {
  "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
  "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
  "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
  "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
  "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
  "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
  "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
  "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
  "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
  "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
};

function generateStateDummyPhone(stateNameOrCode, runIndex) {
  let state = stateNameOrCode;
  if (codeToState[stateNameOrCode.toUpperCase()]) {
    state = codeToState[stateNameOrCode.toUpperCase()];
  }
  
  const areaCodes = stateAreaCodes[state] || ["401"];
  const areaCode = areaCodes[runIndex % areaCodes.length];
  
  // Generate a random-looking US exchange code that is NOT 555 (to bypass bot filters)
  let exchangeCode = String(201 + (runIndex % 798)).padStart(3, '0');
  if (exchangeCode === '555') {
    exchangeCode = '556';
  }
  
  // Format: areaCode - exchangeCode - 4-digit unique suffix (to look like a real US number)
  const suffix = String(1000 + (runIndex % 8999)).padStart(4, '0');
  return `${areaCode}-${exchangeCode}-${suffix}`;
}

module.exports = {
  generateStateDummyPhone
};
