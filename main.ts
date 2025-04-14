import { Component, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, provideHttpClient } from '@angular/common/http';

// Define interfaces for the API response
interface MenuItem {
  name: string;
  description: string;
  price_small?: number;
  price_large?: number;
  small_portion_name?: string;
  large_portion_name?: string;
  short_name: string;
}

interface MenuCategory {
  category: {
    id: number;
    name: string;
    short_name: string;
    special_instructions: string;
  };
  menu_items: MenuItem[];
}

interface MenuResponse {
  [key: string]: MenuCategory;
}

// User Service
class UserService {
  private userInfo: any = null;

  setUserInfo(info: any) {
    this.userInfo = info;
  }

  getUserInfo() {
    return this.userInfo;
  }
}

// Sign Up Component
@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <h2>Sign Up for Newsletter</h2>
      <form #signupForm="ngForm" (ngSubmit)="onSubmit()">
        <div class="form-group">
          <label for="firstName">First Name:</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            class="form-control"
            [(ngModel)]="userInfo.firstName"
            required
            #firstName="ngModel"
          >
          <div *ngIf="firstName.invalid && (firstName.dirty || firstName.touched)" class="error-message">
            First name is required
          </div>
        </div>

        <div class="form-group">
          <label for="lastName">Last Name:</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            class="form-control"
            [(ngModel)]="userInfo.lastName"
            required
            #lastName="ngModel"
          >
          <div *ngIf="lastName.invalid && (lastName.dirty || lastName.touched)" class="error-message">
            Last name is required
          </div>
        </div>

        <div class="form-group">
          <label for="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            class="form-control"
            [(ngModel)]="userInfo.email"
            required
            email
            #email="ngModel"
          >
          <div *ngIf="email.invalid && (email.dirty || email.touched)" class="error-message">
            Please enter a valid email
          </div>
        </div>

        <div class="form-group">
          <label for="phone">Phone:</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            class="form-control"
            [(ngModel)]="userInfo.phone"
            required
            pattern="[0-9]{10}"
            #phone="ngModel"
          >
          <div *ngIf="phone.invalid && (phone.dirty || phone.touched)" class="error-message">
            Please enter a valid 10-digit phone number
          </div>
        </div>

        <div class="form-group">
          <label for="favoriteItem">Favorite Menu Item (short_name):</label>
          <input
            type="text"
            id="favoriteItem"
            name="favoriteItem"
            class="form-control"
            [(ngModel)]="userInfo.favoriteItem"
            required
            (blur)="validateMenuItem()"
            #favoriteItem="ngModel"
          >
          <div *ngIf="menuItemError" class="error-message">
            No such menu number exists
          </div>
        </div>

        <button 
          type="submit" 
          class="nav-button" 
          [disabled]="signupForm.invalid || menuItemError">
          Submit
        </button>

        <div *ngIf="successMessage" class="success-message">
          {{ successMessage }}
        </div>
      </form>
    </div>
  `
})
class SignUpComponent {
  private http = inject(HttpClient);
  private userService = inject(UserService);
  private router = inject(Router);

  userInfo = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    favoriteItem: ''
  };

  menuItemError = false;
  successMessage = '';

  async validateMenuItem() {
    if (!this.userInfo.favoriteItem) return;
    
    try {
      const response = await this.http.get<MenuResponse>(
        'https://coursera-jhu-default-rtdb.firebaseio.com/menu_items.json'
      ).toPromise();
      
      const category = this.userInfo.favoriteItem[0].toUpperCase();
      const itemNumber = this.userInfo.favoriteItem;
      
      if (!response || !response[category]) {
        this.menuItemError = true;
        return;
      }

      const menuItem = response[category].menu_items.find(
        item => item.short_name === itemNumber
      );
      
      this.menuItemError = !menuItem;
    } catch {
      this.menuItemError = true;
    }
  }

  async onSubmit() {
    await this.validateMenuItem();
    if (!this.menuItemError) {
      this.userService.setUserInfo(this.userInfo);
      this.successMessage = 'Your information has been saved.';
      setTimeout(() => this.router.navigate(['/my-info']), 2000);
    }
  }
}

// My Info Component
@Component({
  selector: 'app-my-info',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div *ngIf="userInfo; else notSignedUp">
        <h2>Your Information</h2>
        <div class="form-group">
          <strong>Name:</strong> {{userInfo.firstName}} {{userInfo.lastName}}
        </div>
        <div class="form-group">
          <strong>Email:</strong> {{userInfo.email}}
        </div>
        <div class="form-group">
          <strong>Phone:</strong> {{userInfo.phone}}
        </div>
        <div class="form-group">
          <strong>Favorite Menu Item:</strong> {{userInfo.favoriteItem}}
        </div>
        <div *ngIf="menuItem" class="menu-item">
          <div class="menu-item-details">
            <h3>{{menuItem.name}}</h3>
            <p>{{menuItem.description}}</p>
            <p *ngIf="menuItem.price_small">Small: ${{menuItem.price_small}}</p>
            <p *ngIf="menuItem.price_large">Large: ${{menuItem.price_large}}</p>
          </div>
        </div>
      </div>
      <ng-template #notSignedUp>
        <p>Not Signed Up Yet. <a routerLink="/signup">Sign up Now!</a></p>
      </ng-template>
    </div>
  `
})
class MyInfoComponent {
  private http = inject(HttpClient);
  private userService = inject(UserService);

  userInfo = this.userService.getUserInfo();
  menuItem: MenuItem | null = null;

  ngOnInit() {
    if (this.userInfo?.favoriteItem) {
      this.loadMenuItem();
    }
  }

  async loadMenuItem() {
    try {
      const category = this.userInfo.favoriteItem[0].toUpperCase();
      const itemNumber = this.userInfo.favoriteItem;
      
      const response = await this.http.get<MenuResponse>(
        'https://coursera-jhu-default-rtdb.firebaseio.com/menu_items.json'
      ).toPromise();
      
      if (response && response[category]) {
        this.menuItem = response[category].menu_items.find(
          item => item.short_name === itemNumber
        ) || null;
      }
    } catch (error) {
      console.error('Error loading menu item:', error);
    }
  }
}

// Main App Component
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <div class="nav-bar">
      <button class="nav-button" routerLink="/my-info">My Info</button>
      <button class="nav-button" routerLink="/signup">Sign Up</button>
    </div>
    <router-outlet></router-outlet>
  `
})
class App {
  name = 'Restaurant App';
}

// Bootstrap the application
bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideRouter([
      { path: 'signup', component: SignUpComponent },
      { path: 'my-info', component: MyInfoComponent },
      { path: '', redirectTo: '/my-info', pathMatch: 'full' }
    ]),
    UserService
  ]
}).catch(err => console.error(err));