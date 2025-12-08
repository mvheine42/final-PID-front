import { Component, OnInit } from '@angular/core';
import { OrderService } from 'src/app/services/order_service';

@Component({
  selector: 'app-time',
  templateUrl: './time.component.html',
  styleUrl: './time.component.css'
})
export class TimeComponent implements OnInit{
  rawProductData: any = {}; 
  dataProducts: any;
  optionsProducts: any;
  
  dataDaily: any;
  optionsDaily: any;
  loading: boolean = true;
  loadingProducts: boolean = true;
  loadingDaily: boolean = true;

  sortOptions: any[] = [
    { label: 'Top 5 Fastest 🚀', value: 'asc' },
    { label: 'Top 5 Slowest 🐢', value: 'desc' }
  ];
  selectedSort: string = 'asc';

  availableProducts: any[] = [];
  selectedProducts: any[] = [];

  months: any[] = [
    { label: 'All Months', value: null },
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 }
  ];
  selectedMonth: number | null = null; 
  

  years: any[] = [];
  selectedYear: number | null = null;


  noDataAvailable: boolean = false;
  showDailyTrend: boolean = false;



  avgWaitTotal: string = '0m';
  fastestDish: string = '-';
  slowestDish: string = '-';

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.initYears();
    this.initChartsConfig();
    this.loadData();
  }

  initYears() {
    const currentYear = new Date().getFullYear();
    this.years = [{ label: 'All Years', value: null }];
    // Generar desde 2020 hasta el año actual
    for (let year = 2020; year <= currentYear; year++) {
      this.years.push({ label: year.toString(), value: year });
    }
  }

  loadData() {
    this.loading = true;
    this.loadingProducts = true;
    this.loadingDaily = true;
    this.noDataAvailable = false;


    const hasMonthFilter = this.selectedMonth !== null;
    const hasYearFilter = this.selectedYear !== null;
    const hasAnyFilter = hasMonthFilter || hasYearFilter;


    const month = hasAnyFilter ? (this.selectedMonth || undefined) : undefined;
    const year = hasAnyFilter ? (this.selectedYear || undefined) : undefined;

    this.orderService.getWaitTimeByProduct(month, year).subscribe({
      next: (data) => {
        if (!data || Object.keys(data).length === 0) {
          this.noDataAvailable = true;
          this.rawProductData = {};
          this.availableProducts = [];
          this.selectedProducts = [];
          this.avgWaitTotal = '0m';
          this.fastestDish = '-';
          this.slowestDish = '-';
          this.dataProducts = { labels: [], datasets: [] };
        } else {
          this.rawProductData = data;
          this.availableProducts = Object.keys(data).map(key => ({ name: key, code: key }));
          this.selectedProducts = [...this.availableProducts];
          this.calculateKPIs(data);
          this.updateProductChart();
        }
        this.loadingProducts = false;
      },
      error: (err) => {
        this.noDataAvailable = true;
        this.loadingProducts = false;
      }
    });

    // Si NO hay filtros, ocultamos daily trend y no llamamos al backend
    if (this.selectedMonth === null && this.selectedYear === null) {
      this.showDailyTrend = false;
      this.loadingDaily = false;
      this.loading = false;
      return;
    }

    this.showDailyTrend = true;


    this.orderService.getWaitTimeByDay(month, year).subscribe({
      next: (data) => {
        if (!data || Object.keys(data).length === 0) {
          this.dataDaily = { labels: [], datasets: [] };
        } else {
          this.setupDailyChart(data);
        }
        this.loadingDaily = false;
        this.loading = false;
      },
      error: (err) => {
        this.loadingDaily = false;
        this.loading = false;
      }
    });
  }

  onMonthChange() {
    this.loadData();
  }


  updateProductChart() {
    let items = Object.keys(this.rawProductData).map(key => ({
      name: key,
      value: this.rawProductData[key]
    }));

    const selectedNames = this.selectedProducts.map(p => p.name);
    items = items.filter(item => selectedNames.includes(item.name));

    items.sort((a, b) => {
      return this.selectedSort === 'asc' 
        ? a.value - b.value 
        : b.value - a.value;
    });


    items = items.slice(0, 5);

    this.dataProducts = {
      labels: items.map(i => i.name),
      datasets: [
        {
          label: 'Minutes Avg',
          data: items.map(i => i.value),
          backgroundColor: items.map(i => this.getColorForValue(i.value)), 
          borderWidth: 1
        }
      ]
    };
  }

  getColorForValue(val: number): string {
    if (val < 10) return '#81c784';
    if (val < 20) return '#ffb74d'; 
    return '#e57373';
  }

  setupDailyChart(data: any) {
      const labels = Object.keys(data);
      const values = Object.values(data);
      this.dataDaily = {
        labels: labels,
        datasets: [{
            label: 'Average wait time (Min)',
            data: values,
            fill: true,
            borderColor: '#7f522e',
            backgroundColor: 'rgba(127, 82, 46, 0.2)',
            tension: 0.4
        }]
      };
  }

  calculateKPIs(data: any) {
      const values = Object.values(data) as number[];
      const keys = Object.keys(data);
      if (values.length === 0) return;
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      this.avgWaitTotal = this.formatTime(avg);
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      this.fastestDish = `${keys[values.indexOf(minVal)]} (${this.formatTime(minVal)})`;
      this.slowestDish = `${keys[values.indexOf(maxVal)]} (${this.formatTime(maxVal)})`;
  }

  formatTime(decimal: number): string {
      if (!decimal) return '0m';
      const minutes = Math.floor(decimal);
      const seconds = Math.round((decimal - minutes) * 60);
      return `${minutes}m ${seconds}s`;
  }

  initChartsConfig() {
      const textColor = '#4e342e';
      const surfaceBorder = '#dcc3a1';
      this.optionsProducts = {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor }, grid: { color: surfaceBorder } },
          y: { ticks: { color: textColor }, grid: { display: false } }
        }
      };
      this.optionsDaily = {
         plugins: { legend: { labels: { color: textColor } } },
         scales: {
            y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: surfaceBorder } },
            x: { ticks: { color: textColor }, grid: { color: surfaceBorder } }
         }
      };
  }
}