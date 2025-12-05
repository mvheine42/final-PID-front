import { Component, OnInit } from '@angular/core';
import { OrderService } from 'src/app/services/order_service';

@Component({
  selector: 'app-time',
  templateUrl: './time.component.html',
  styleUrl: './time.component.css'
})
export class TimeComponent implements OnInit{
  // --- DATA ---
  rawProductData: any = {}; // Acá guardamos la respuesta original del backend
  dataProducts: any;        // Esto es lo que se muestra en el gráfico
  optionsProducts: any;
  
  dataDaily: any;
  optionsDaily: any;

  // --- CONTROLES ---
  // Opciones para el botón de ordenamiento
  sortOptions: any[] = [
    { label: 'Top 5 Fastest 🚀', value: 'asc' },
    { label: 'Top 5 Slowest 🐢', value: 'desc' }
  ];
  selectedSort: string = 'asc'; // Por default: los más rápidos

  // Opciones para el filtro de productos
  availableProducts: any[] = []; // Lista para el dropdown
  selectedProducts: any[] = [];  // Lo que eligió el usuario

  // KPIs
  avgWaitTotal: string = '0m';
  fastestDish: string = '-';
  slowestDish: string = '-';

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.initChartsConfig();
    this.loadData();
  }

  loadData() {
    // 1. TRAEMOS LOS DATOS
    this.orderService.getWaitTimeByProduct().subscribe({
      next: (data) => {
        this.rawProductData = data; // Guardamos el original
        
        // Preparamos el filtro (Dropdown) con todos los productos disponibles
        this.availableProducts = Object.keys(data).map(key => ({ name: key, code: key }));
        // Por defecto seleccionamos TODOS
        this.selectedProducts = [...this.availableProducts];

        this.calculateKPIs(data);
        this.updateProductChart(); // Generamos el gráfico inicial
      },
      error: (err) => console.error(err)
    });

    this.orderService.getWaitTimeByDay().subscribe({
      next: (data) => {
        this.setupDailyChart(data);
      },
      error: (err) => console.error(err)
    });
  }

  // --- EL CORAZÓN DEL FILTRO ---
  updateProductChart() {
    // 1. Convertimos el objeto { "Sopa": 5.5 } a array [{name: "Sopa", value: 5.5}]
    let items = Object.keys(this.rawProductData).map(key => ({
      name: key,
      value: this.rawProductData[key]
    }));

    // 2. FILTRAR: Solo dejamos los que el usuario seleccionó en el MultiSelect
    const selectedNames = this.selectedProducts.map(p => p.name);
    items = items.filter(item => selectedNames.includes(item.name));

    // 3. ORDENAR: Ascendente (Rápido) o Descendente (Lento)
    items.sort((a, b) => {
      return this.selectedSort === 'asc' 
        ? a.value - b.value 
        : b.value - a.value;
    });

    // 4. CORTAR: Nos quedamos solo con los Top 5
    items = items.slice(0, 5);

    // 5. ARMAR DATA PARA PRIMENG
    this.dataProducts = {
      labels: items.map(i => i.name),
      datasets: [
        {
          label: 'Minutes Avg',
          data: items.map(i => i.value),
          backgroundColor: items.map(i => this.getColorForValue(i.value)), // Color dinámico
          borderWidth: 1
        }
      ]
    };
  }

  // Función extra: Colorcito verde si es rápido, rojo si es lento
  getColorForValue(val: number): string {
    if (val < 10) return '#81c784'; // Verde pastel
    if (val < 20) return '#ffb74d'; // Naranja pastel
    return '#e57373'; // Rojo pastel
  }

 // RECORDATORIO: En setupDailyChart, initChartsConfig y calculateKPIs no cambies nada, sirven igual.
  setupDailyChart(data: any) {
      const labels = Object.keys(data);
      const values = Object.values(data);
      this.dataDaily = {
        labels: labels,
        datasets: [{
            label: 'Tiempo Espera Promedio (Min)',
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
        indexAxis: 'y', // <--- TRUCAZO: Esto hace las barras HORIZONTALES (mejor para leer nombres largos)
        plugins: { legend: { display: false } }, // Ocultamos leyenda pq ya dice arriba
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


