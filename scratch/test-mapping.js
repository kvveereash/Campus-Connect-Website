const CAMPUS_IMAGES = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19'
];

const COLLEGE_IMAGE_MAP = {
    'apex university':                          '2',
    'bits pilani':                              '12',
    'christ university':                        '0',
    'delhi university':                         '3',
    'indian institute of technology':           '6',
    'iit ':                                     '6',
    'kgisl':                                    '1',
    'manipal academy':                          '11',
    'national institute of design':             '4',
    'symbiosis international':                  '7',
    'vit university':                           '19',
};

function stableHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0;
}

function getCollegeImage(collegeName) {
    const lower = collegeName.toLowerCase();
    console.log(`Checking: "${collegeName}" (lower: "${lower}")`);
    
    for (const [key, url] of Object.entries(COLLEGE_IMAGE_MAP)) {
        if (lower.includes(key)) {
            console.log(`  Matched named key: "${key}" -> index ${url}`);
            return url;
        }
    }

    const hashValue = stableHash(collegeName);
    const index = hashValue % CAMPUS_IMAGES.length;
    console.log(`  No match. Hash: ${hashValue}, Index: ${index}`);
    return index.toString();
}

const colleges = [
    'Apex University',
    'BITS Pilani — Goa Campus',
    'Christ University, Bangalore',
    'Delhi University — North Campus',
    'IIT Mumbai',
    'Kgisl',
    'Manipal Academy of Higher Education',
    'National Institute of Design, Ahmedabad',
    'Symbiosis International, Pune',
    'VIT University, Vellore'
];

colleges.forEach(c => getCollegeImage(c));
