import * as d3 from 'd3';

const SALES = 'Sales Amount (k)';
const GROSS = 'Gross Profit (k)';
const MONTH = 'Month';
const PRODUCT_NAME = 'Product Name';
const colors = d3.scaleOrdinal(d3.schemeCategory10);

const svgWidth = 960;
const svgHeight = 400;
const margin = { top: 20, right: 20, bottom: 40, left: 40 };
const svg = d3.select('#sales-graph')
  .append('svg')
  .attr('id', 'chart')
  .attr('width', svgWidth)
  .attr('height', svgHeight);

const g = svg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.right})`);


let apiData = null;

// synchoronouly load data
async function initAPI() {
  const jsonResponse = await fetch('./data/d3_data.json');
  let salesData = await jsonResponse.json();

  drawAxisLegend(salesData.Sales);
}

function drawAxisLegend(salesData) {

  // create array of months to be used by x axis scale
  const months = salesData.reduce((last, data) => {
    if (last.indexOf(data[MONTH]) === -1) {
      last.push(data[MONTH]);
    }
    return last;
  }, []);

  // x axis scale
  const scaleX = d3.scaleBand()
    .domain(months)
    .rangeRound([0, svgWidth - margin.right])
    .padding(0.1);


  // find the max profit in all the products
  const maxProfit = d3.max(salesData, (sales) => sales['Sales Amount (k)']);

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

  Object.keys(salesObj).forEach((sale, index) => {
    drawLine(index, sale, salesObj[sale], scaleX, scaleY);
  });

}

function drawLine(index, product, sale, scaleX, scaleY) {

  const line = d3.line()
    .x(d => (scaleX(d[MONTH]) + scaleX.bandwidth() / 2))
    .y(d => scaleY(d[SALES]));
  
  const lineG = g.append('g');
  lineG.append('path')
    .attr('d', line(sale.data))
    .attr('stroke', colors(index))
    .attr('stroke-width', 2)
    .attr('fill', 'none');

  lineG.selectAll('circle')
    .data(sale.data)
    .enter()
    .append('circle')
    .attr('cx', d => (scaleX(d[MONTH]) + scaleX.bandwidth() / 2))
    .attr('cy', d => scaleY(d[SALES]))
    .attr('r', 3)
    .attr('fill', colors(index))
    .attr('cursor', 'pointer')
    .on('mouseover', function(d) {
      d3.select(this).attr('r', 5);
    })
    .on('mouseout', function(d) {
      d3.select(this).attr('r', 3);
    })
    .append("svg:title")
    .text(d => `Sales: ${d[SALES]}, Gross: ${d[GROSS]}`);  
}


initAPI();


