/* charts.js
  Chart helper that exposes generateAllCharts(records)
  Each record: { name, bp: "120/80", sugar, pulse, weight, ts }
*/

window.generateAllCharts = function(records){
  if(!Array.isArray(records)) records = [];

  const labels = records.map(r => new Date(r.ts||Date.now()).toLocaleDateString());
  const sys = records.map(r => parseInt((r.bp||'0/0').split('/')[0]||0));
  const dia = records.map(r => parseInt((r.bp||'0/0').split('/')[1]||0));
  const sugar = records.map(r => parseFloat(r.sugar||0));
  const pulse = records.map(r => parseFloat(r.pulse||0));
  const weight = records.map(r => parseFloat(r.weight||0));

  // BP bar (systolic + diastolic)
  try{ window.chartBP && window.chartBP.destroy(); }catch(e){}
  const ctxBP = document.getElementById('chartBP').getContext('2d');
  window.chartBP = new Chart(ctxBP, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Systolic', data: sys, backgroundColor: 'rgba(255,90,149,0.9)' },
        { label: 'Diastolic', data: dia, backgroundColor: 'rgba(59,130,246,0.85)' }
      ]
    },
    options: { responsive:true, maintainAspectRatio:false }
  });

  // sugar line
  try{ window.chartSugar && window.chartSugar.destroy(); }catch(e){}
  const ctxS = document.getElementById('chartSugar').getContext('2d');
  window.chartSugar = new Chart(ctxS, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Sugar (mg/dL)', data: sugar, borderColor:'#16a34a', fill:false }] },
    options: { responsive:true, maintainAspectRatio:false }
  });

  // pulse
  try{ window.chartPulse && window.chartPulse.destroy(); }catch(e){}
  const ctxP = document.getElementById('chartPulse').getContext('2d');
  window.chartPulse = new Chart(ctxP, {
    type: 'line',
    data: { labels, datasets: [{ label:'Pulse (bpm)', data: pulse, borderColor:'#f59e0b', fill:false }] },
    options: { responsive:true, maintainAspectRatio:false }
  });

  // weight
  try{ window.chartWeight && window.chartWeight.destroy(); }catch(e){}
  const ctxW = document.getElementById('chartWeight').getContext('2d');
  window.chartWeight = new Chart(ctxW, {
    type: 'line',
    data: { labels, datasets: [{ label:'Weight (kg)', data: weight, borderColor:'#6366f1', fill:false }] },
    options: { responsive:true, maintainAspectRatio:false }
  });
};
