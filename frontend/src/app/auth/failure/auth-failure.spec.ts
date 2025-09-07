import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthFailureComponent as AuthFailure } from './auth-failure';

describe('AuthFailure', () => {
  let component: AuthFailure;
  let fixture: ComponentFixture<AuthFailure>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthFailure]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthFailure);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
