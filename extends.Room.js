// https://github.com/ScreepsQuorum/screeps-quorum
const unicodeModifier = 200;
const quadrantMap = {
    0: {
        x: 'E',
        y: 'N'
    },
    1: {
        x: 'E',
        y: 'S'
    },
    2: {
        x: 'W',
        y: 'S'
    },
    3: {
        x: 'W',
        y: 'N'
    }
};
global.ROOM_STANDARD = 		'room'
global.ROOM_SOURCE_KEEPER =	'source_keeper'
global.ROOM_CENTER =		'center'
global.ROOM_HIGHWAY = 		'highway'
global.ROOM_CROSSROAD = 	'highway_portal'

Room.serializeName = function (name) {
    if (name === 'sim') {
        return 'sim';
    }
    const coords = Room.getCoordinates(name);
    let quad;
    if (coords.x_dir === 'E') {
        quad = coords.y_dir === 'N' ? '0' : '1';
    } else {
        quad = coords.y_dir === 'S' ? '2' : '3';
    }
    const x = String.fromCodePoint(+coords.x + +unicodeModifier);
    const y = String.fromCodePoint(+coords.y + +unicodeModifier);
    return `${quad}${x}${y}`;
};

Room.deserializeName = function (sName) {
    if (sName === 'sim') {
        return 'sim';
    }
    const xDir = quadrantMap[sName[0]].x;
    const yDir = quadrantMap[sName[0]].y;
    const x = sName.codePointAt(1) - unicodeModifier;
    const y = sName.codePointAt(2) - unicodeModifier;
    return `${xDir}${x}${yDir}${y}`;
};

Room.prototype.getCoordinates = function () {
    const name = this.name;
    const coordinateRegex = /(E|W)(\d+)(N|S)(\d+)/g;
    const match = coordinateRegex.exec(name);
    return {
        'x': match[2],
        'y': match[4],
        'x_dir': match[1],
        'y_dir': match[3]
    };
};

Room.prototype.describe = function() {
    const name = this.name;
    const [EW, NS] = name.match(/\d+/g)
    if (EW%10 == 0 && NS%10 == 0) {
        return ROOM_CROSSROAD
    }
  	else if (EW%10 == 0 || NS%10 == 0) {
          return ROOM_HIGHWAY
      }
	else if (EW%5 == 0 && NS%5 == 0) {
        return ROOM_CENTER
    }
	else if (Math.abs(5 - EW%10) <= 1 && Math.abs(5 - NS%10) <= 1) {
        return ROOM_SOURCE_KEEPER
    }
	else {
        return ROOM_STANDARD
    }
}