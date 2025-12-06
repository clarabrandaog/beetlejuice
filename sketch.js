// ----------------------------------------------------------
// SECONDARY SCREEN — CREW LIST
// ----------------------------------------------------------

let dataTable;
let people = [];
let departments = {};

let scrollY = 0;
let maxScroll = 0;
let dragging = false;
let lastY = 0;
let targetPersonName = null;
let hasScrolledToTarget = false;

// Spiral background state
let angle = 0;
let wigglePhase = 0;

const TEXT_COLOR_HEX = "#580FC8";

// ----------------------------------------------------------
// PRELOAD CSV
// ----------------------------------------------------------
function preload() {
  dataTable = loadTable("crew.csv", "csv", "header");
}

// ----------------------------------------------------------
// SETUP
// ----------------------------------------------------------
function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Open Sans");
  textAlign(LEFT, TOP);
  pixelDensity(max(1, displayDensity()));

  buildPeopleFromTable();
  
  // Get the person name from query parameter
  const params = new URLSearchParams(window.location.search);
  targetPersonName = params.get('person');
}

// ----------------------------------------------------------
// DRAW
// ----------------------------------------------------------
function draw() {
  drawBackgroundSpiral();
  drawScrollableList();
  scrollY = constrain(scrollY, maxScroll, 0);
  
  // Auto-scroll to target person if specified and not yet scrolled
  if (!hasScrolledToTarget && targetPersonName) {
    scrollToTargetPerson();
  }
}

// ----------------------------------------------------------
// BUILD PEOPLE FROM TABLE
// ----------------------------------------------------------
function buildPeopleFromTable() {
  people = [];
  departments = {};

  for (let r = 0; r < dataTable.getRowCount(); r++) {
    const row = dataTable.getRow(r);

    const name = row.get("name") || "No name";
    const picture = row.get("picture");
    const bio = row.get("bio") || "";
    const fn = row.get("function") || "";
    const dept = row.get("department") || "Unknown";

    const p = new Person(name, picture, bio, fn, dept);
    people.push(p);

    if (!departments[dept]) departments[dept] = [];
    departments[dept].push(p);
  }
}

// ----------------------------------------------------------
// PERSON CLASS
// ----------------------------------------------------------
class Person {
  constructor(name, picture, bio, fn, department) {
    this.name = name || "No name";
    this.picture = picture || null;
    this.bio = bio || "";
    this.fn = fn || "";
    this.department = department || "Unknown";

    if (this.picture) {
      this.img = loadImage(this.picture,
        img => { this.img = img; },
        err => { 
          console.warn(`Failed to load image: ${this.picture}`);
          this.img = null; 
        }
      );
    } else {
      this.img = null;
    }
  }
}

// ----------------------------------------------------------
// SCROLLABLE LIST
// ----------------------------------------------------------
function drawScrollableList() {
  fill(TEXT_COLOR_HEX);
  noStroke();

  push();
  translate(0, scrollY);

  let y = 36;
  const leftPad = 18;
  const cardW = width - leftPad * 2;
  const imgSize = min(96, floor(width * 0.17));

  const deptNames = Object.keys(departments).sort((a, b) => a.localeCompare(b));

  for (let dept of deptNames) {
    // DEPARTMENT TITLE
    textAlign(CENTER, TOP);
    textSize(34);
    textStyle(BOLD);
    fill(TEXT_COLOR_HEX);
    text(dept.toUpperCase(), width / 2, y);
    y += 48;

    // PEOPLE IN THIS DEPARTMENT
    for (let p of departments[dept]) {
      const cardH = max(110, imgSize + 24);

      // card
      fill(255, 245);
      stroke(220);
      strokeWeight(0.6);
      rect(leftPad, y, cardW, cardH, 14);

      // portrait mask
      const px = leftPad + 16;
      const py = y + 12;

      push();
      translate(px + imgSize / 2, py + imgSize / 2);
      drawingContext.save();
      drawingContext.beginPath();
      drawingContext.arc(0, 0, imgSize / 2, 0, TWO_PI);
      drawingContext.clip();

      if (p.img && p.img.width > 1) {
        imageMode(CENTER);
        image(p.img, 0, 0, imgSize, imgSize);
      } else {
        fill(200);
        ellipse(0, 0, imgSize, imgSize);
      }

      drawingContext.restore();

      // border
      stroke(TEXT_COLOR_HEX);
      strokeWeight(3);
      noFill();
      ellipse(0, 0, imgSize, imgSize);
      pop();

      // TEXT
      let tx = px + imgSize + 16;
      let ty = y + 14;

      // NAME — bold
      textAlign(LEFT, TOP);
      fill(TEXT_COLOR_HEX);
      textSize(18);
      textStyle(BOLD);
      text(p.name, tx, ty);
      ty += textAscent() + 6;

      // FUNCTION — bold
      textSize(14);
      textStyle(BOLD);
      text(p.fn, tx, ty);
      ty += textAscent() + 10;

      // BIO — normal
      textSize(13);
      textLeading(16);
      textStyle(NORMAL); // make sure bio is not bold
      const bioW = width - tx - 18;
      text(p.bio, tx, ty, bioW, cardH - (ty - y) - 18);

      y += cardH + 14;
    }

    y += 8;
  }

  y += 40;
  const contentBottom = y;
  maxScroll = min(0, height - contentBottom - 20);

  pop();
}


// ----------------------------------------------------------
// SPIRAL BACKGROUND
// ----------------------------------------------------------
function drawBackgroundSpiral() {
  background("#9bb745");
  angle -= 0.01;
  wigglePhase += 0.05;
  const wiggleScale = 1 + sin(wigglePhase) * 0.05;
  drawSpiral(width / 2, height / 2, angle, wiggleScale);
}

function drawSpiral(cx, cy, rotation, scaleVal) {
  push();
  translate(cx, cy);
  rotate(rotation);
  scale(scaleVal);

  fill("rgba(155,183,69,0.2)");
  blendMode(MULTIPLY);

  beginShape();
  noStroke();

  const maxRadius = min(width, height * 2) * 0.6;
  const turns = 5;
  const points = 200;

  for (let i = 0; i <= points; i++) {
    const t = i / points;
    const a = t * turns * TWO_PI;
    const r = t * maxRadius;
    vertex(cos(a) * r, sin(a) * r);
  }
  for (let i = points; i >= 0; i--) {
    const t = i / points;
    const a = t * turns * TWO_PI;
    const r = t * maxRadius * 0.85;
    vertex(cos(a) * r, sin(a) * r);
  }

  endShape(CLOSE);

  blendMode(BLEND);
  pop();
}

// ----------------------------------------------------------
// SCROLLING INPUT
// ----------------------------------------------------------
function mouseWheel(e) {
  scrollY -= e.delta;
  scrollY = constrain(scrollY, maxScroll, 0);
}

function touchStarted() {
  dragging = true;
  lastY = touches[0].y;
}

function touchMoved() {
  if (!dragging) return false;
  let ty = touches[0].y;
  let dy = ty - lastY;
  lastY = ty;
  scrollY += dy;
  scrollY = constrain(scrollY, maxScroll, 0);
  return false;
}

function touchEnded() {
  dragging = false;
}

function mousePressed() {
  dragging = true;
  lastY = mouseY;
}

function mouseDragged() {
  if (!dragging) return;
  let dy = mouseY - lastY;
  lastY = mouseY;
  scrollY += dy;
  scrollY = constrain(scrollY, maxScroll, 0);
}

function mouseReleased() {
  dragging = false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ----------------------------------------------------------
// AUTO-SCROLL TO TARGET PERSON
// ----------------------------------------------------------
function scrollToTargetPerson() {
  if (!targetPersonName) return;
  
  let yPos = 36;
  const leftPad = 18;
  const imgSize = min(96, floor(width * 0.17));
  const deptNames = Object.keys(departments).sort((a, b) => a.localeCompare(b));
  
  for (let dept of deptNames) {
    yPos += 48; // department title height
    
    for (let p of departments[dept]) {
      if (p.name === targetPersonName) {
        // Found the target person, scroll to them
        // Position the person card near the top of the viewport
        scrollY = constrain(-(yPos - 150), maxScroll, 0);
        hasScrolledToTarget = true;
        return;
      }
      const cardH = max(110, imgSize + 24);
      yPos += cardH + 14;
    }
    yPos += 8;
  }
}
