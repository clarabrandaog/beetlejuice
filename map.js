// FULL p5.js sketch — floating, collision-free clusters with smooth edge forces
// Put crew.csv (name,picture,bio,function,department) and images/title.png in same folder.

let people = [];
let clusters = {};
let imgCache = {};
let dataTable;
let defaultThumb = "https://i.ibb.co/YFzCxxzD/thumb.png";
let titleImg;
let qrImg;

let angle = 0;
let wigglePhase = 0;

// Image forbidden rectangle
let imageZone = { x: 0, y: 0, w: 0, h: 0 };

function preload() {
  dataTable = loadTable("crew.csv", "csv", "header");
  titleImg = loadImage("images/title.png");
  qrImg = loadImage("images/qr code.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Create cluster containers
  for (let r = 0; r < dataTable.getRowCount(); r++) {
    const row = dataTable.getRow(r);
    const dept = row.get("department") || "Unknown";
    if (!clusters[dept]) clusters[dept] = { members: [] };
  }

  // Create people
  for (let r = 0; r < dataTable.getRowCount(); r++) {
    const row = dataTable.getRow(r);
    const p = new Person(
      row.get("name"),
      row.get("picture") || defaultThumb,
      row.get("bio"),
      row.get("function"),
      row.get("department") || "Unknown"
    );
    clusters[p.department].members.push(p);
    people.push(p);

    if (!imgCache[p.picture]) {
      imgCache[p.picture] = loadImage(p.picture, () => {}, () => {
        imgCache[p.picture] = loadImage(defaultThumb);
      });
    }
  }

  // Initialize cluster radii
  for (let dept in clusters) {
    const cl = clusters[dept];
    cl.r = max(70, sqrt(cl.members.length) * 32);
    // Random initial positions near canvas center
    cl.cx = width / 2 + random(-100, 100);
    cl.cy = height / 2 + random(-100, 100);
  }

  // Initialize people inside clusters
  for (let dept in clusters) {
    const cl = clusters[dept];
    for (let p of cl.members) {
      let a = random(TWO_PI);
      let rr = cl.r * sqrt(random());
      p.pos = createVector(cl.cx + rr * cos(a), cl.cy + rr * sin(a));
      p.vel = createVector(0, 0);
    }
  }

  imageMode(CORNER);
  noStroke();
}

function draw() {
  drawBackgroundSpiral();
  drawHeaderImage();
  physicsStep();

  imageMode(CENTER);
  for (let dept in clusters) {
    const cl = clusters[dept];
    noFill();
    stroke(200, 180);
    strokeWeight(1);
    circle(cl.cx, cl.cy, cl.r * 2);
    noStroke();
    for (let p of cl.members) p.display();
  }
  imageMode(CORNER);
}

// ---------------------- physics ----------------------
function physicsStep() {
  const kAttract = 0.03;       // People attracted to cluster center
  const maxForce = 1.5;        // Max velocity
  const damping = 0.88;        // Velocity damping
  const clusterSoft = 0.15;    // Soft push inside cluster radius
  const clusterRepel = 1.2;    // Increased repulsion
  const floatAmplitude = 12;   // Cluster floating amplitude
  const floatSpeed = 0.02;     // Floating speed

  const clusterKeys = Object.keys(clusters);

  // 1) Cluster repulsion (stronger and more spacing)
  for (let i = 0; i < clusterKeys.length; i++) {
    for (let j = i + 1; j < clusterKeys.length; j++) {
      let c1 = clusters[clusterKeys[i]];
      let c2 = clusters[clusterKeys[j]];
      let diff = createVector(c2.cx - c1.cx, c2.cy - c1.cy);
      let distCenters = diff.mag();
      let minDist = c1.r + c2.r + 80; // more spacing between clusters
      if (distCenters < minDist && distCenters > 0) {
        let push = diff.copy().normalize().mult((minDist - distCenters) * clusterRepel);
        c2.cx += push.x * 0.5;
        c2.cy += push.y * 0.5;
        c1.cx -= push.x * 0.5;
        c1.cy -= push.y * 0.5;
      }
    }
  }

  // 2) Floating clusters + edge forces
  for (let dept in clusters) {
    let c = clusters[dept];
    let phase = dept.length * 0.37;
    c.cx += sin(frameCount * floatSpeed + phase) * (floatAmplitude * 0.005);
    c.cy += cos(frameCount * floatSpeed + phase) * (floatAmplitude * 0.005);

    applyClusterEdgeForces(c);
    keepOutImageZoneCluster(c);

    // Keep inside canvas
    c.cx = constrain(c.cx, c.r + 20, width - c.r - 20);
    c.cy = constrain(c.cy, c.r + 20, height - c.r - 20);
  }

  // 3) People attraction to cluster center + velocity integration
  for (let p of people) {
    const cl = clusters[p.department];
    let toCenter = p5.Vector.sub(createVector(cl.cx, cl.cy), p.pos).mult(kAttract);
    p.vel.add(toCenter);

    if (p.vel.mag() > maxForce) p.vel.setMag(maxForce);
    p.vel.mult(damping);
    p.pos.add(p.vel);

    keepOutImageZonePerson(p);
    p.pos.x = constrain(p.pos.x, p.radius, width - p.radius);
    p.pos.y = constrain(p.pos.y, p.radius, height - p.radius);
  }

  // 4) Hard separation between people
  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      let p1 = people[i];
      let p2 = people[j];
      let diff = p5.Vector.sub(p2.pos, p1.pos);
      let d = diff.mag();
      let minDist = p1.radius + p2.radius + 2;
      if (d < minDist && d > 0) {
        let push = diff.copy().normalize().mult((minDist - d) * 0.5);
        p1.pos.sub(push);
        p2.pos.add(push);
      } else if (d === 0) {
        p1.pos.x += random(-0.5, 0.5);
        p1.pos.y += random(-0.5, 0.5);
      }
    }
  }

  // 5) Soft boundary: push people inside cluster radius
  for (let p of people) {
    const cl = clusters[p.department];
    let distToCenter = dist(p.pos.x, p.pos.y, cl.cx, cl.cy);
    if (distToCenter > cl.r) {
      let back = p5.Vector.sub(createVector(cl.cx, cl.cy), p.pos);
      let excess = distToCenter - cl.r;
      let push = back.setMag(excess * clusterSoft);
      p.pos.add(push);
    }
  }
}

// ---------------------- Image zone helpers ----------------------
function drawHeaderImage() {
  if (!titleImg) return; // titleImg must exist

  const padding = 6;
  const aspectTitle = 2188 / 418;
  let maxZoneHeight = height * 0.5;
  let titleH = min(maxZoneHeight, height * 0.28);
  let titleW = titleH * aspectTitle;
  if (titleW > width * 0.8) {
    titleW = width * 0.8;
    titleH = titleW / aspectTitle;
  }
  let titleX = padding;
  let titleY = height - titleH - padding;

  // Draw title image
  imageMode(CORNER);
  image(titleImg, titleX, titleY, titleW, titleH);

  // QR code calculations
  let showQR = windowWidth > 700 && qrImg; // Only show on wide screens
  let qrSize = titleH;
  let qrX = width - qrSize - padding;
  let qrY = height - qrSize - padding;

  if (showQR) {
    image(qrImg, qrX, qrY, qrSize, qrSize);
  }

  // Update forbidden image zone
  const zoneMargin = 24;
  if (showQR) {
    // Zone includes both title and QR code
    imageZone.x = titleX - zoneMargin;
    imageZone.y = min(titleY, qrY) - zoneMargin;
    imageZone.w = (qrX + qrSize) - titleX + zoneMargin * 2;
    imageZone.h = max(titleH, qrSize) + zoneMargin * 2;
  } else {
    // Zone only covers title image
    imageZone.x = titleX - zoneMargin;
    imageZone.y = titleY - zoneMargin;
    imageZone.w = titleW + zoneMargin * 2;
    imageZone.h = titleH + zoneMargin * 2;
  }
}


function keepOutImageZonePerson(p) {
  const rx1 = imageZone.x, ry1 = imageZone.y;
  const rx2 = imageZone.x + imageZone.w, ry2 = imageZone.y + imageZone.h;
  if (p.pos.x + p.radius > rx1 && p.pos.x - p.radius < rx2 &&
      p.pos.y + p.radius > ry1 && p.pos.y - p.radius < ry2) {
    const leftDist = Math.abs((p.pos.x - p.radius) - rx1);
    const rightDist = Math.abs(rx2 - (p.pos.x + p.radius));
    const topDist = Math.abs((p.pos.y - p.radius) - ry1);
    const bottomDist = Math.abs(ry2 - (p.pos.y + p.radius));
    const minDist = Math.min(leftDist, rightDist, topDist, bottomDist);
    if (minDist === leftDist) p.pos.x = rx1 - p.radius - 1;
    else if (minDist === rightDist) p.pos.x = rx2 + p.radius + 1;
    else if (minDist === topDist) p.pos.y = ry1 - p.radius - 1;
    else p.pos.y = ry2 + p.radius + 1;
    if (p.vel) {
      if (minDist === leftDist && p.vel.x > 0) p.vel.x = 0;
      if (minDist === rightDist && p.vel.x < 0) p.vel.x = 0;
      if (minDist === topDist && p.vel.y > 0) p.vel.y = 0;
      if (minDist === bottomDist && p.vel.y < 0) p.vel.y = 0;
    }
  }
}

function keepOutImageZoneCluster(c) {
  const rx1 = imageZone.x, ry1 = imageZone.y;
  const rx2 = imageZone.x + imageZone.w, ry2 = imageZone.y + imageZone.h;
  if (c.cx + c.r > rx1 && c.cx - c.r < rx2 && c.cy + c.r > ry1 && c.cy - c.r < ry2) {
    const leftMove = rx1 - (c.cx + c.r), rightMove = rx2 - (c.cx - c.r);
    const topMove = ry1 - (c.cy + c.r), bottomMove = ry2 - (c.cy - c.r);
    const moves = [{dir:"left",val:Math.abs(leftMove)},{dir:"right",val:Math.abs(rightMove)},{dir:"top",val:Math.abs(topMove)},{dir:"bottom",val:Math.abs(bottomMove)}];
    moves.sort((a,b)=>a.val-b.val);
    const choice = moves[0].dir;
    if(choice==="left") c.cx = rx1-c.r-1;
    else if(choice==="right") c.cx = rx2+c.r+1;
    else if(choice==="top") c.cy = ry1-c.r-1;
    else c.cy = ry2+c.r+1;
  }
}

function applyClusterEdgeForces(c) {
  const margin = 60, k = 0.02;
  if(c.cx-c.r<margin) c.cx+=(margin-(c.cx-c.r))*k;
  if(width-(c.cx+c.r)<margin) c.cx-=(margin-(width-(c.cx+c.r)))*k;
  if(c.cy-c.r<margin) c.cy+=(margin-(c.cy-c.r))*k;
  if(imageZone.y-(c.cy+c.r)<margin) c.cy-=(margin-(imageZone.y-(c.cy+c.r)))*k;
}

// ---------------------- Person class ----------------------
class Person {
  constructor(name, picture, bio, fn, department) {
    this.name = name;
    this.picture = picture || defaultThumb;
    this.bio = bio;
    this.fn = fn;
    this.department = department;

    this.pos = createVector(random(width), random(height));
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);

    // Initial size based on screen width
    this.size = windowWidth <= 700 ? 60 : 90;
    this.radius = this.size / 2;
  }

  // Returns current size dynamically
  getSize() {
    return windowWidth <= 700 ? 60 : 90;
  }

  // Returns current radius dynamically
  getRadius() {
    return this.getSize() / 2;
  }

  display() {
    const size = this.getSize();
    const radius = this.getRadius();

    push();
    translate(this.pos.x, this.pos.y);

    // Clip to circular shape
    drawingContext.save();
    drawingContext.beginPath();
    drawingContext.arc(0, 0, radius, 0, TWO_PI);
    drawingContext.clip();

    imageMode(CENTER);
    let img = imgCache[this.picture];
    if (img) image(img, 0, 0, size, size);
    else { fill(150); noStroke(); ellipse(0, 0, size, size); }

    drawingContext.restore();

    // Draw circle border
    stroke(255);
    strokeWeight(2);
    noFill();
    drawingContext.beginPath();
    drawingContext.arc(0, 0, radius, 0, TWO_PI);
    drawingContext.stroke();

    pop();
  }
}


function mousePressed(){
  // Check if clicked on any person ball
  for(let p of people){
    let d = dist(mouseX, mouseY, p.pos.x, p.pos.y);
    if(d < p.radius){
      // Navigate to sketch.js with person name as query parameter
      window.location.href = 'browser.html?person=' + encodeURIComponent(p.name);
      return;
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  for (let dept in clusters) {
    const cl = clusters[dept];

    // Reset cluster positions
    cl.cx = width / 2 + random(-100, 100);
    cl.cy = height / 2 + random(-100, 100);

    for (let p of cl.members) {
      // Reset people positions inside clusters
      let a = random(TWO_PI);
      let rr = cl.r * sqrt(random());
      p.pos = createVector(cl.cx + rr * cos(a), cl.cy + rr * sin(a));
      p.vel = createVector(0, 0);

      // Update size and radius based on screen width
      p.size = windowWidth <= 700 ? 50 : 90;
      p.radius = p.size / 2;
    }
  }
}


// ------------- background spiral --------------
function drawBackgroundSpiral(){
  background("#9bb745"); angle-=0.01; wigglePhase+=0.05;
  const wiggleScale=1+sin(wigglePhase)*0.05;
  drawSpiral(width/2,height/2,angle,wiggleScale);
}

function drawSpiral(cx,cy,rotation,scaleVal){
  push(); translate(cx,cy); rotate(rotation); scale(scaleVal);
  fill("rgba(155,183,69,0.2)"); blendMode(MULTIPLY); beginShape(); noStroke();
  const maxRadius=min(width,height*2); const turns=5; const points=200;
  for(let i=0;i<=points;i++){ const t=i/points; const a=t*turns*TWO_PI; const r=t*maxRadius; vertex(cos(a)*r,sin(a)*r);}
  for(let i=points;i>=0;i--){ const t=i/points; const a=t*turns*TWO_PI; const r=t*maxRadius*0.85; vertex(cos(a)*r,sin(a)*r);}
  endShape(CLOSE); blendMode(BLEND); pop();
}
