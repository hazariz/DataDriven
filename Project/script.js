const FISHER_YATES = 'fisher-yates';
const UNIQUE_IDX = 'unique-idx';

const fmtPct = d3.format('.1f');
const fmtK = d3.format('.0s');

const {
  unsort,
  // unsortInplace,
  version,
} = this.unsort;

console.log('array-unsort version', version);

// Initial values
let length = 8;
let iterations = 100000;
let algo = UNIQUE_IDX;

// Could use D3's 'range', but why? For a code reader this is easier to comprehend
function range(length) {
  if (length < 1) {
    throw new Error(`Invalid array length: ${length}`);
  }

  const arr = [];
  for (let i = 0; i < length; i++) {
    arr.push(i);
  }
  return arr;
}

function processMap(map, iterations, algo) {
  let freqMax = -Infinity;
  let freqMin = Infinity;

  switch (algo) {
    case FISHER_YATES:
      Object.keys(map).forEach((key) => {
        Object.keys(map[key]).forEach((pos) => {
          const count = map[key][pos];
          const freq = count / iterations;
          freqMin = (freq < freqMin) ? freq : freqMin;
          freqMax = (freq > freqMax) ? freq : freqMax;
        });
      });
      return { freqMax, freqMin };
    case UNIQUE_IDX:
      Object.keys(map).forEach((key, i) => {
        Object.keys(map[key]).forEach((pos, j) => {
          if (i !== j) {
            const count = map[key][pos];
            const freq = count / iterations;
            freqMin = (freq < freqMin) ? freq : freqMin;
            freqMax = (freq > freqMax) ? freq : freqMax;
          }
        });
      });
      return { freqMax, freqMin };
    default:
      console.log(`Invalid algo: ${algo}`);
  }

  return null;
}

function createTable(map, container, iterations, algo) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  const { length } = Object.keys(map);
  const data = [];

  Object.keys(map).forEach((key) => {
    const items = Object.keys(map[key]);
    const values = items.map((item) => map[key][item]);
    data.push(values);
  });

  const header = ['Input'];
  const topTrHead = document.createElement('tr');
  let th = document.createElement('th');
  th.innerHTML = '';
  topTrHead.appendChild(th);

  th = document.createElement('th');
  th.innerHTML = 'Output';
  th.setAttribute('colspan', `${length}`);
  topTrHead.appendChild(th);
  thead.appendChild(topTrHead);

  range(length).forEach((d) => header.push(`Idx ${d}`));
  const trHead = document.createElement('tr');
  header.forEach((d) => {
    const th = document.createElement('th');
    th.innerHTML = d;
    trHead.appendChild(th);
  });
  ['Expected', 'Range'].forEach((d) => {
    const th = document.createElement('th');
    th.innerHTML = d;
    th.className = 'last';
    trHead.appendChild(th);
  });

  thead.appendChild(trHead);
  table.appendChild(thead);
  const expected = algo === FISHER_YATES
    ? Math.round(iterations / length)
    : Math.round(iterations / (length - 1));

  data.forEach((row, rowIdx) => {
    const tr = document.createElement('tr');
    const td0 = document.createElement('td');
    td0.innerHTML = `Idx ${rowIdx}`;
    tr.appendChild(td0);
    let max = -Infinity;
    let min = Infinity;

    row.forEach((d, colIdx) => {
      max = d > max ? d : max;
      min = algo === FISHER_YATES
        ? d < min ? d : min
        : rowIdx !== colIdx
          ? d < min ? d : min
          : min;

      // Determine error (defined as > +- 5% of expected value)
      const error = d !== 0 && (Math.abs(expected - d) > (expected * 0.05));

      const td = document.createElement('td');
      td.innerHTML = `${d}`;
      td.className = d === 0 ? 'zero-value' : null;
      td.classList.add(error ? 'error' : null);
      tr.appendChild(td);
    });

    const rangePct = Math.abs(max - min) / expected;

    let td = document.createElement('td');
    td.innerHTML = expected;
    tr.appendChild(td);
    td = document.createElement('td');
    td.innerHTML = `${fmtPct(rangePct * 100)}%`;
    td.className = 'last';
    tr.appendChild(td);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function go(length, iterations, algo) {
  // Init map
  const map = {};
  range(length).forEach((i) => {
    const obj = {};
    range(length).forEach((j) => {
      obj[`pos${j}`] = 0;
    });
    map[`index${i}`] = obj;
  });

  // Measure performance, start timer
  const startTs = Date.now();

  // Iterate and update map
  range(iterations).forEach(() => {
    let arr = range(length);

    // Unsort (scramble) the array
    arr = unsort(arr, algo);
    // arr = unsortInplace(arr, algo);

    // Update map
    arr.forEach((i, j) => {
      map[`index${i}`][`pos${j}`]++;
    });
  });

  // Measure performance, end timer
  const duration = Date.now() - startTs;

  // Get frequency data
  const freq = processMap(map, iterations, algo);

  // Clear the container
  const container = document.querySelector('.container');
  container.innerHTML = '';

  // Add title to the container
  const title = document.createElement('div');
  title.className = 'title';
  title.innerHTML =
    `Frequency Distribution (array length: ${length}, iterations: ${fmtK(iterations)})`;
  container.appendChild(title);

  // Create the frequency distribution table
  createTable(map, container, iterations, algo);

  // Frequency stats
  const { freqMax, freqMin } = freq;
  const statsText = `Max freq: ${fmtPct(freqMax * 100)}%, Min freq: ${fmtPct(freqMin * 100)}%`;
  const statsElem = document.createElement('div');
  statsElem.innerHTML = statsText;
  statsElem.className = 'stats';
  container.appendChild(statsElem);

  // Performance
  const durationText = `Duration: ${duration}ms`;
  const durationElem = document.createElement('div');
  durationElem.innerHTML = durationText;
  durationElem.className = 'stats';
  container.appendChild(durationElem);

  // Notice
  const errorText =
    'Any red value deviates more than 5% from expected value, and may indicate uneven distribution';
  const errorElem = document.createElement('div');
  errorElem.innerHTML = errorText;
  errorElem.className = 'stats error';
  container.appendChild(errorElem);
}

function radioChange(evt) {
  const { value } = evt.target;
  algo = value;
}

function arraySizeRangeChange(evt) {
  const { value } = evt.target;
  length = +value;
  const arraySizeElem = document.querySelector('#arraySize');
  arraySizeElem.innerHTML = `${length}`;
}

function iterationRangeChange(evt) {
  const { value } = evt.target;
  iterations = 10 ** +value;
  const iterationsElem = document.querySelector('#iterations');
  iterationsElem.innerHTML = `${fmtK(iterations)}`;
}

function goButtonClick() {
  // Clear the container
  const container = document.querySelector('.container');
  container.innerHTML = '';

  // Add title to the container
  const title = document.createElement('div');
  title.className = 'title';
  title.innerHTML =
    `Executing ${fmtK(iterations)} shuffle operations with array length ${length}...`;
  container.appendChild(title);

  // Run the shuffling with current array length, iteration count and algorithm
  setTimeout(() => { go(length, iterations, algo); }, 1);
}

// Event handlers
document.querySelector('#algo0').onchange = radioChange;
document.querySelector('#algo1').onchange = radioChange;
document.querySelector('#iterationsRange').oninput = iterationRangeChange;
document.querySelector('#arraySizeRange').oninput = arraySizeRangeChange;
document.querySelector('#goButton').onclick = goButtonClick;

// Initial update
go(length, iterations, algo);