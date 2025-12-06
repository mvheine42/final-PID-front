import { Component, OnInit } from '@angular/core';
import { ChartService } from '../../services/chart_service';

@Component({
  selector: 'app-charts',
  templateUrl: './charts.component.html',
  styleUrls: ['./charts.component.css']
})
export class ChartsComponent implements OnInit {
    selectedYear: string | undefined;
    selectedMonth: string | undefined;
    availableYears: string[] = ['2022', '2023', '2024', '2025'];
    availableMonths: string[] = [
        '01', '02', '03', '04', '05', '06', 
        '07', '08', '09', '10', '11', '12'
    ];

    loading: boolean = false;
    loadingCharts: boolean = false;
    categoryData: any;
    categoryOptions: any;
    monthlyData: any;
    monthlyOptions: any;
    averagePerPersonData: any;
    averagePerPersonOptions: any;
    averagePerTicketData: any;
    averagePerTicketOptions: any;
    
    noDataMessage: string = '';
    public scrollHeight: string = '';
    
    fechaActual = new Date();
    yearActual = this.fechaActual.getFullYear();
    monthActual = this.fechaActual.getMonth() + 1;
    
    // Cache properties
    private categoryRevenueCache: any = null;
    private categoryRevenueCacheTime: number = 0;
    private monthlyRevenueCache: any = null;
    private monthlyRevenueCacheTime: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(private chartService: ChartService) {
        this.selectedYear = this.yearActual.toString();
        this.selectedMonth = this.monthActual.toString().padStart(2, '0');
    }

    ngOnInit() {
        this.loading = true;

        Promise.all([
            this.loadCategoryRevenuePromise(),
            this.loadMonthlyRevenuePromise(),
            this.loadAveragePerPersonDataPromise(),
            this.loadAveragePerTicketDataPromise()
        ])
        .then(() => {
            this.loading = false;
        }).catch(() => {
            this.loading = false;
        });

        this.setScrollHeight();

        window.addEventListener('resize', () => {
            this.setScrollHeight();
        });

        // Chart styles
        const documentStyle = getComputedStyle(this.getHostElement());
        const textColor = documentStyle.getPropertyValue('--text-color');
        const gridColor = documentStyle.getPropertyValue('--surface-border');

        const commonOptions = {
            maintainAspectRatio: false,
            aspectRatio: 0.6,
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                },
                y: {
                    ticks: {
                        color: textColor
                    },
                    grid: {
                        color: gridColor
                    }
                }
            }
        };

        this.categoryOptions = {
            plugins: {
                legend: {
                    labels: {
                        usePointStyle: true,
                        color: textColor
                    }
                }
            }
        };

        this.monthlyOptions = { ...commonOptions };
        this.averagePerPersonOptions = { ...commonOptions };
        this.averagePerTicketOptions = { ...commonOptions };
    }

    onDateChange(): void {
    this.loadingCharts = true;  // 👈 Solo loading parcial
    Promise.all([
        this.loadAveragePerPersonDataPromise(),
        this.loadAveragePerTicketDataPromise()
    ]).then(() => {
        this.loadingCharts = false;
    }).catch(() => {
        this.loadingCharts = false;
    });
    }
    
    getHostElement(): HTMLElement {
        const hostElement = document.querySelector('app-charts');
        if (!hostElement) {
            throw new Error('Host element not found');
        }
        return hostElement as HTMLElement;
    }

    loadCategoryRevenuePromise(): Promise<void> {
        return new Promise((resolve, reject) => {
        const now = Date.now();
        
        if (this.categoryRevenueCache && (now - this.categoryRevenueCacheTime < this.CACHE_DURATION)) {
            this.categoryData = this.categoryRevenueCache;
            resolve();
            return;
        }
        
        this.chartService.getCategoryRevenue().subscribe(
            (response) => {
                if (response && Object.keys(response).length > 0) {
                    const categories = Object.keys(response);
                    const revenues = Object.values(response);
                    const documentStyle = getComputedStyle(this.getHostElement());
                    const colorKeys = [
                        'light-cream', 'light-tan', 'beige', 'light-brown', 'medium-brown',
                        'brown', 'dark-brown', 'darker-brown', 'deep-brown', 'deepest-brown'
                    ];
                    const backgroundColors = colorKeys.map(key => 
                        documentStyle.getPropertyValue(`--${key}`)
                    );
                    
                    this.categoryData = {
                        labels: categories,
                        datasets: [{
                            data: revenues,
                            backgroundColor: backgroundColors
                        }]
                    };
                    
                    this.categoryRevenueCache = this.categoryData;
                    this.categoryRevenueCacheTime = now;
                } else {
                    console.warn('No revenue data available');
                    this.categoryData = { labels: [], datasets: [] };
                }
                resolve();
            },
            (error) => {
                console.error('Error fetching category revenue', error);
            }
        );
        });
    }

    clearCategoryRevenueCache() {
        this.categoryRevenueCache = null;
        this.categoryRevenueCacheTime = 0;
    }

    loadMonthlyRevenuePromise(): Promise<void> {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            
            if (this.monthlyRevenueCache && (now - this.monthlyRevenueCacheTime < this.CACHE_DURATION)) {
                this.monthlyData = this.monthlyRevenueCache;
                resolve();
                return;
            }
        
        this.chartService.getMonthlyRevenue().subscribe(
            (response) => {
                if (response && Object.keys(response).length > 0) {
                    const revenueByYear: { [year: string]: { [month: string]: number } } = {};
                    
                    Object.keys(response).forEach(dateKey => {
                        const [year, month] = dateKey.split('-');
                        if (!revenueByYear[year]) {
                            revenueByYear[year] = {};
                        }
                        revenueByYear[year][month] = response[dateKey];
                    });
                    
                    const lineColors = ['#0000FF', '#8B4513'];
                    
                    const datasets = Object.keys(revenueByYear)
                        .sort()
                        .map((year, index) => {
                            const revenueData = Array(12).fill(null);
                            
                            Object.keys(revenueByYear[year]).forEach(month => {
                                const monthIndex = parseInt(month) - 1;
                                revenueData[monthIndex] = revenueByYear[year][month];
                            });
                            
                            return {
                                label: `Revenue ${year}`,
                                data: revenueData,
                                fill: false,
                                borderColor: lineColors[index % lineColors.length],
                                tension: 0.4,
                                spanGaps: true
                            };
                        });
                    
                    const orderedMonthLabels = [
                        "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
                    ];
                    
                    this.monthlyData = {
                        labels: orderedMonthLabels,
                        datasets: datasets
                    };
                    
                    this.monthlyRevenueCache = this.monthlyData;
                    this.monthlyRevenueCacheTime = now;
                } else {
                    console.warn('No monthly revenue data available');
                    this.monthlyData = { labels: [], datasets: [] };
                }
                resolve();
            },
            (error) => {
                console.error('Error fetching monthly revenue', error);
            }
        );
        });
    }

    clearMonthlyRevenueCache() {
        this.monthlyRevenueCache = null;
        this.monthlyRevenueCacheTime = 0;
    }

    loadAveragePerPersonDataPromise(): Promise<void> {
        return new Promise((resolve, reject) => {
        const year = this.selectedYear ?? this.yearActual.toString();
        const month = this.selectedMonth ?? this.monthActual.toString().padStart(2, '0');

        this.chartService.getAveragePerPerson(year, month).subscribe(
            data => {
                const values = Object.values(data) as number[];
                const total = values.reduce((sum, value) => sum + value, 0);
            
                if (total === 0) {
                    this.noDataMessage = `No data available for ${month}/${year}`;
                    this.averagePerPersonData = null;
                } else {
                    this.noDataMessage = '';
                    
                    // Extract just the day number for labels
                    const labels = Object.keys(data).map(dateStr => {
                        const day = dateStr.split('-')[2];
                        return parseInt(day).toString();
                    });
                    
                    this.averagePerPersonData = {
                        labels: labels,
                        datasets: [{
                            label: 'Average Per Person',
                            data: values,
                            fill: false,
                            borderColor: '#565656',
                            tension: 0.4
                        }]
                    };
                }
                resolve();
            },
            error => {
                console.error('Error fetching average per person', error);
                this.noDataMessage = 'Error loading data';
            }
        );
        });
    }
    
    loadAveragePerTicketDataPromise(): Promise<void> {
        return new Promise((resolve, reject) => {
        const year = this.selectedYear ?? this.yearActual.toString();
        const month = this.selectedMonth ?? this.monthActual.toString().padStart(2, '0');
        
        this.chartService.getAveragePerTicket(year, month).subscribe(
            data => {
                const values = Object.values(data) as number[];
                const total = values.reduce((sum, value) => sum + value, 0);
    
                if (total === 0) {
                    this.noDataMessage = `No data available for ${month}/${year}`;
                    this.averagePerTicketData = null;
                } else {
                    this.noDataMessage = '';
                    
                    // Extract just the day number for labels
                    const labels = Object.keys(data).map(dateStr => {
                        const day = dateStr.split('-')[2];
                        return parseInt(day).toString();
                    });
                    
                    this.averagePerTicketData = {
                        labels: labels,
                        datasets: [{
                            label: 'Average Per Ticket',
                            data: values,
                            fill: false,
                            borderColor: '#734f38',
                            tension: 0.4
                        }]
                    };
                }
                resolve();
            },
            error => {
                console.error('Error fetching average per ticket', error);
                this.noDataMessage = 'Error loading data';
            }
        );
        });
    }

    setScrollHeight() {
        if (window.innerWidth <= 768) {
            this.scrollHeight = '800px';
        } else {
            this.scrollHeight = '400px';
        }
    }

    loadCategoryRevenue() {
    this.loadCategoryRevenuePromise();
}

loadMonthlyRevenue() {
    this.loadMonthlyRevenuePromise();
}

loadAveragePerPersonData() {
    this.loadAveragePerPersonDataPromise();
}

loadAveragePerTicketData() {
    this.loadAveragePerTicketDataPromise();
}


}