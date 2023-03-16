
const svg = document.getElementById('svg-plane');
let width = 0;
let height = 0;
let scale = 1;

let points = [];
let lines = [];
let squares = [];
let triangles = [];

const boundingBox = {
    xMin: -1,
    xMax: 1,
    yMin: -1,
    yMax: 1,
};

const boundingBoxCenter = () => ([
    (boundingBox.xMax + boundingBox.xMin) / 2,
    (boundingBox.yMax + boundingBox.yMin) / 2
])

const coordinateToScreen = (u, v) => {
    const min = Math.min(width, height);
    const [uCenter, vCenter] = boundingBoxCenter();
    const x = width / 2 + (u - uCenter) * min * 0.2;
    const y = height / 2 - (v - vCenter) * min * 0.2;
    return [x, y];
}

const screenToCoordinate = (x, y) => {
    const min = Math.min(width, height);
    const [uCenter, vCenter] = boundingBoxCenter();
    const u = (x - width / 2) / (min * 0.2) + uCenter;
    const v = (height / 2 - y) / (min * 0.2) + vCenter;
    return [u, v];
}

class Point {
    constructor(x, y, id, draggable = null) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.draggable = draggable;
        this.dragged = false;
        points.push(this);
    }

    draw() {
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        const [x, y] = coordinateToScreen(this.x, this.y);
        point.setAttribute('cx', `${x}`);
        point.setAttribute('cy', `${y}`);
        point.setAttribute('class', `point  ${this.draggable !== null ? 'point-draggable' : ''}`);
        point.setAttribute('id', this.id);
        if (this.draggable !== null) {
            point.addEventListener('mousedown', e => this.dragStart(e, this));
            point.addEventListener('touchstart', e => this.dragStart(e, this));
            point.addEventListener('touchend', e => this.dragEnd(e, this));
        }
        svg.getElementById('g-point').appendChild(point);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', `${x - 20}`);
        text.setAttribute('y', `${y + 20}`);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('id', 'text' + this.id);
        text.setAttribute('class', 'text');
        text.textContent = this.id;
        svg.getElementById('g-text').appendChild(text);
    }

    redraw() {
        const point = svg.getElementById(this.id);
        const [x, y] = coordinateToScreen(this.x, this.y);
        point.setAttribute('cx', `${x}`);
        point.setAttribute('cy', `${y}`);
        const text = svg.getElementById('text' + this.id);
        text.setAttribute('x', `${x - 20}`);
        text.setAttribute('y', `${y + 20}`);
    }

    dragStart(e, point) {
        point.dragged = true;
    }

    drag(e, point) {
        if (point.dragged) {
            e.preventDefault();

            if (e.touches) {
                e = e.touches[0];
            }

            const CTM = svg.getScreenCTM();
            const [mX, mY] = screenToCoordinate(e.clientX - CTM.e, e.clientY - CTM.f);

            if (point.draggable === 'x' && mX > 0.15) {
                point.x = mX;
            } else if (point.draggable === 'y' && mY > 0.15) {
                point.y = mY;
            }
        }
    }

    dragEnd(e, point) {
        point.dragged = false;
    }
}

class Line {
    constructor(point1, point2, dashed = false) {
        this.id = [point1.id, point2.id].sort().reduce((a, b) => a + b, '');
        this.point1 = point1;
        this.point2 = point2;
        this.dashed = dashed;
        lines.push(this);
    }

    draw() {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const [x1, y1] = coordinateToScreen(this.point1.x, this.point1.y);
        const [x2, y2] = coordinateToScreen(this.point2.x, this.point2.y);
        line.setAttribute('x1', `${x1}`);
        line.setAttribute('y1', `${y1}`);
        line.setAttribute('x2', `${x2}`);
        line.setAttribute('y2', `${y2}`);
        line.setAttribute('class', `line ${this.dashed ? 'line-dashed' : ''}`);
        line.setAttribute('id', this.id);
        svg.getElementById('g-line').appendChild(line);
    }

    redraw() {
        const line = svg.getElementById(this.id);
        const [x1, y1] = coordinateToScreen(this.point1.x, this.point1.y);
        const [x2, y2] = coordinateToScreen(this.point2.x, this.point2.y);
        line.setAttribute('x1', `${x1}`);
        line.setAttribute('y1', `${y1}`);
        line.setAttribute('x2', `${x2}`);
        line.setAttribute('y2', `${y2}`);
    }
}

class Square {
    constructor(point1, point2, id1, id2) {
        this.point1 = point1;
        this.point2 = point2;
        const dx = point2.y - point1.y;
        const dy = point1.x - point2.x;
        this.P1 = new Point(point2.x + dx, point2.y + dy, id1);
        this.P2 = new Point(point1.x + dx, point1.y + dy, id2);
        this.L1 = new Line(point2, this.P1, false);
        this.L2 = new Line(this.P1, this.P2);
        this.L3 = new Line(this.P2, point1);
        this.id = [point1.id, point2.id, id1, id2].sort().reduce((a, b) => a + b, '');
        squares.push(this);
    }

    draw() {
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', Square.calculatePointsString(this.point2, this.P1, this.P2, this.point1));
        poly.setAttribute('class', 'poly');
        poly.setAttribute('id', this.id);
        svg.getElementById('g-poly').appendChild(poly);
    }

    redraw() {
        const dx = this.point2.y - this.point1.y;
        const dy = this.point1.x - this.point2.x;
        this.P1.x = this.point2.x + dx;
        this.P1.y = this.point2.y + dy;
        this.P2.x = this.point1.x + dx;
        this.P2.y = this.point1.y + dy;

        const poly = svg.getElementById(this.id);
        poly.setAttribute('points', Square.calculatePointsString(this.point2, this.P1, this.P2, this.point1));
    }

    static calculatePointsString(P1, P2, P3, P4) {
        const [x1, y1] = coordinateToScreen(P1.x, P1.y);
        const [x2, y2] = coordinateToScreen(P2.x, P2.y);
        const [x3, y3] = coordinateToScreen(P3.x, P3.y);
        const [x4, y4] = coordinateToScreen(P4.x, P4.y);
        return `${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}`;
    }
}

class Triangle {
    constructor(point1, point2, point3) {
        this.point1 = point1;
        this.point2 = point2;
        this.point3 = point3
        this.id = [point1.id, point2.id, point3.id].sort().reduce((a, b) => a + b, '');
        triangles.push(this);
    }

    draw() {
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        poly.setAttribute('points', Triangle.calculatePointsString(this.point2, this.point3, this.point1));
        poly.setAttribute('class', 'poly');
        poly.setAttribute('id', this.id);
        svg.getElementById('g-poly').appendChild(poly);
    }

    redraw() {
        const poly = svg.getElementById(this.id);
        poly.setAttribute('points', Triangle.calculatePointsString(this.point2, this.point3, this.point1));
    }

    static calculatePointsString(P1, P2, P3) {
        const [x1, y1] = coordinateToScreen(P1.x, P1.y);
        const [x2, y2] = coordinateToScreen(P2.x, P2.y);
        const [x3, y3] = coordinateToScreen(P3.x, P3.y);
        return `${x1},${y1} ${x2},${y2} ${x3},${y3}`;
    }
}

class ProjectedPoint extends Point {
    constructor(line, point, name) {
        const [x, y] = ProjectedPoint.calculate(line, point);
        super(x, y, name);
        this.line = line;
        this.point = point;
    }

    draw() {
        super.draw();
    }

    redraw() {
        const [x, y] = ProjectedPoint.calculate(this.line, this.point);
        this.x = x;
        this.y = y;
        super.redraw();
    }

    static calculate(line, point) {
        const dx = line.point2.x - line.point1.x;
        const dy = line.point2.y - line.point1.y;
        const len = (dx * dx + dy * dy);

        const rx = point.x - line.point1.x;
        const ry = point.y - line.point1.y;

        const s = (dx * rx + dy * ry) / len;

        const x = line.point1.x + s * dx;
        const y = line.point1.y + s * dy;

        return [x, y];
    }
}

const construct = () => {
    const A = new Point(0, 0, "Α");
    const B = new Point(1, 0, "Β", 'x');
    const C = new Point(0, 1.5, "Γ", 'y');

    const ABZH = new Square(A, B, "Ζ", "Η");
    const BCED = new Square(B, C, "Ε", "Δ");
    const CATK = new Square(C, A, "Θ", "Κ");

    new Line(A, B);
    new Line(B, C);
    new Line(C, A);

    const L = new ProjectedPoint(BCED.L2, A, 'Λ');
    new Line(A, L, true);
    new Line(A, BCED.P2, true);
    new Line(A, BCED.P1, true);

    new Line(B, CATK.P2, true);
    new Line(C, ABZH.P1, true);

    new Triangle(A, B, BCED.P2);
    new Triangle(ABZH.P1, B, C);
    new Triangle(BCED.P2, B, L);

    triangles.forEach(triangle => triangle.draw());
    squares.forEach(square => square.draw());
    lines.forEach(line => line.draw());
    points.forEach(point => point.draw());
}

const draw = () => {
    triangles.forEach(triangle => triangle.redraw());
    squares.forEach(square => square.redraw());
    lines.forEach(line => line.redraw());
    points.forEach(point => point.redraw());
}

const highlightPoint = (id, hover) => {
    const pointElement = svg.getElementById(id);
    const textElement = svg.getElementById('text' + id);
    if (!textElement || !pointElement) {
        return
    }

    if (hover) {
        pointElement.classList.add('selected-point');
        textElement.classList.add('selected-text');
    } else {
        pointElement.classList.remove('selected-point');
        textElement.classList.remove('selected-text');
    }
}

const highlightLine = (id, hover) => {
    const sorted = id.split('').sort().reduce((a, b) => a + b, '');
    const lineElement = svg.getElementById(sorted);

    if (!lineElement) {
        return
    }

    if (hover) {
        lineElement.classList.add('selected-line');
    } else {
        lineElement.classList.remove('selected-line');
    }

    id.split('').forEach(letter => highlightPoint(letter, hover));
}

const highlightAngle = (id, hover) => {
    const letters = id.split('');

    highlightPoint(letters[0], hover);
    highlightPoint(letters[1], hover);
    highlightPoint(letters[2], hover);

    highlightLine(letters[0] + letters[1], hover);
    highlightLine(letters[1] + letters[2], hover);
}


const highlightPoly = (id, hover) => {
    const sorted = id.split('').sort().reduce((a, b) => a + b, '');
    const polyElement = svg.getElementById(sorted);

    if (!polyElement) {
        return
    }

    if (hover) {
        polyElement.classList.add('selected-poly');
    } else {
        polyElement.classList.remove('selected-poly');
    }
}

const setBoundingBox = () => {
    width = svg.getBoundingClientRect().width;
    height = svg.getBoundingClientRect().height;

    points.forEach(p => {
        boundingBox.xMax = Math.max(boundingBox.xMax, p.x);
        boundingBox.xMin = Math.min(boundingBox.xMin, p.x);
        boundingBox.yMax = Math.max(boundingBox.yMax, p.y);
        boundingBox.yMin = Math.min(boundingBox.yMin, p.y);
    })
}

const step = () => {
    draw();
    window.requestAnimationFrame(step);
}

const init = () => {
    width = svg.getBoundingClientRect().width;
    height = svg.getBoundingClientRect().height;

    construct();
    setBoundingBox();

    const text = document.getElementById('text')
    const elements = text.getElementsByTagName('em');

    [...elements].forEach(e => {
        const targetName = e.getAttribute('data-target') ? e.getAttribute('data-target') : e.textContent;
        switch (e.getAttribute('data-type')) {
            case "line":
                e.addEventListener('mouseover', () => highlightLine(targetName, true));
                e.addEventListener('mouseleave', () => highlightLine(targetName, false));
                break;
            case "point":
                e.addEventListener('mouseover', () => highlightPoint(targetName, true));
                e.addEventListener('mouseleave', () => highlightPoint(targetName, false));
                break;
            case "angle":
                e.addEventListener('mouseover', () => highlightAngle(targetName, true));
                e.addEventListener('mouseleave', () => highlightAngle(targetName, false));
                break;
            case "tri":
            case "poly":
                e.addEventListener('mouseover', () => highlightPoly(targetName, true));
                e.addEventListener('mouseleave', () => highlightPoly(targetName, false));
                break;
            default:
                break;
        }
    })

    const drag = (e) => {
        const draggedPoint = points.filter(p => p.dragged);

        if (draggedPoint.length > 0) {
            draggedPoint[0].drag(e, draggedPoint[0]);
        }
    }

    const dragEnd = e => {
        const draggedPoint = points.filter(p => p.dragged)

        if (draggedPoint.length > 0) {
            draggedPoint[0].dragged = false;
        }
    }

    svg.addEventListener('touchmove', drag);
    svg.addEventListener('touchend', dragEnd);
    svg.addEventListener('touchleave', dragEnd);
    svg.addEventListener('touchcancel', dragEnd);
    svg.addEventListener('mousemove', drag);
    svg.addEventListener('mouseup', dragEnd);
    svg.addEventListener('mouseleave', dragEnd);  

    window.requestAnimationFrame(step);
    window.onresize = setBoundingBox;
}

init();
