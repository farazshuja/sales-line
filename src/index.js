import * as d3 from 'd3';
import styles from './css/sales-lines.css';

// json object attribute names
const SALES = 'Sales Amount (k)';
const GROSS = 'Gross Profit (k)';
const MONTH = 'Month';
const PRODUCT_NAME = 'Product Name';

// color array of lines
const colors = d3.scaleOrdinal(d3.schemeCategory10);

// adjust width/height and margins of the graph
const svgWidth = 960;
const svgHeight = 400;
const margin = { top: 50, right: 100, bottom: 100, left: 80 };

// creating the main svg
const svg = d3.select('#sales-graph')
  .append('svg')
  .attr('id', 'chart')
  .attr('width', svgWidth)
  .attr('height', svgHeight);

// graph area to show lines and axis
const g = svg.append("g")
  .attr('class', 'sales-graph-area')
  .attr("transform", `translate(${margin.left}, ${margin.top})`);


// synchoronouly load data
async function initAPI() {
  const jsonResponse = await fetch('./data/d3_data.json');
  let salesData = await jsonResponse.json();

  drawAxisLegend(salesData.Sales);
}

// create scales, axis and draw graph
function drawAxisLegend(salesData) {
  // create array of months to be used by x axis scale
  const months = salesData.reduce((last, data) => {
    if (last.indexOf(data[MONTH]) === -1) {
      last.push(data[MONTH]);
    }
    return last;
  }, []);

  // x axis scale for months
  const scaleX = d3.scaleBand()
    .domain(months)
    .rangeRound([0, svgWidth - margin.right])
    .padding(0.1);


  // find the max profit in all the products
  const maxProfit = d3.max(salesData, (sales) => sales['Sales Amount (k)']);

  // y axis scale for sales
  const scaleY = d3.scaleLinear()
    .domain([0, maxProfit])
    .range([svgHeight - margin.bottom, 0]);

  g.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(0, ${svgHeight - margin.bottom})`)
    .call(d3.axisBottom(scaleX));

  g.append('g')
    .attr('class', 'axis axis--y')
    .attr('transform', `translate(0, 0)`)
    .call(d3.axisLeft(scaleY).ticks(8));

  // split products into separate object of sales
  // will be used to draw products line by line
  const salesObj = salesData.reduce((last, sale) => {
    const productName = sale[PRODUCT_NAME];
    if (!last[productName]) {
      last[productName] = {
        data: []
      }
    }
    last[productName].data.push(sale);
    return last;
  }, {});

  let products = [];
  Object.keys(salesObj).forEach((sale, index) => {
    drawLine(index, sale, salesObj[sale], scaleX, scaleY);
    products.push(sale);
  });

  drawLegend(products);

}

// draw a line for product along with dots and hook interactivity
function drawLine(index, product, sale, scaleX, scaleY) {

  const line = d3.line()
    .x(d => (scaleX(d[MONTH]) + scaleX.bandwidth() / 2))
    .y(d => scaleY(d[SALES]));

  const lineG = g.append('g');
  const linePath = lineG.append('path')
    .attr('d', line(sale.data))
    .attr('stroke', colors(index))
    .attr('stroke-width', 2)
    .attr('fill', 'none');

  // animate line by changing the dashoffset
  const totalLength = linePath.node().getTotalLength();
  linePath
    .attr("stroke-dasharray", totalLength + " " + totalLength)
    .attr("stroke-dashoffset", totalLength)
    .transition()
    .duration(1000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0)

  // draw circles with initial radio 0
  const circles = lineG.selectAll('circle.cir')
    .data(sale.data)
    .enter()
    .append('circle')
    .attr('class', 'cir')
    .attr('cx', d => (scaleX(d[MONTH]) + scaleX.bandwidth() / 2))
    .attr('cy', d => scaleY(d[SALES]))
    .attr('r', 0)
    .attr('fill', colors(index))
    .attr('cursor', 'pointer');

  // animate radius to 3 once the lines are drawn
  circles
    .transition()
    .delay(1000)
    .attr('r', 3)

  // hook interactivity to circles
  circles
    .on('mouseover', function (d) {
      d3.select(this).attr('r', 5);
    })
    .on('mouseout', function (d) {
      if (!d3.select(this).classed('selected')) {
        d3.select(this).attr('r', 3);
      }
    })
    .on('click', function (d, i) {
      d3.selectAll('circle.cir')
        .classed('selected', false)
        .attr('fill', '#aaa')
        .attr('opacity', .75)
        .attr('r', 3);

      d3.select(this)
        .classed('selected', true)
        .attr('opacity', 1)
        .attr('fill', (d, i) => colors(i))
        .attr('r', 5);
    })
    .append("svg:title")
    .text(d => `Sales: ${d[SALES]}, Gross: ${d[GROSS]}`);
}

// draw legends, title and labels
function drawLegend(products) {
  let title = svg.append('g')
    .attr('transform', `translate(${(svgWidth / 2) + margin.left}, ${margin.top - 10})`)
    .attr('class', 'legend')
    .append('text')
    .attr('class', 'chart-title')
    .text('Monthly Sales');

  // label y axis
  let labelY = svg.append('g')
    .attr('transform', `translate(25, ${svgHeight / 2})`)
    .attr('class', 'axis-label')
    .append('text')
    .attr('class', 'axis-label-title')
    .text('Sales ($)');

  let legend = svg.append('g')
    .attr('transform', `translate(0,${svgHeight - 10})`)
    .attr('class', 'legend');

  let legendScale = d3.scaleBand()
    .domain(d3.range(products.length))
    .rangeRound([0, svgWidth - margin.right])
    .padding(2);

  legend.selectAll('line')
    .data(products)
    .enter()
    .append('line')
    .attr('x1', (d, i) => legendScale(i))
    .attr('y1', -3)
    .attr('x2', (d, i) => legendScale(i) + 50)
    .attr('y2', -3)
    .attr('stroke', (d, i) => colors(i))
    .attr('stroke-width', 5);

  legend.selectAll('text')
    .data(products)
    .enter()
    .append('text')
    .attr('x', (d, i) => legendScale(i) + 55)
    .attr('y', 0)
    .attr('class', 'legend-text')
    .text(d => d)
}


initAPI();


