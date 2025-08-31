import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class AboutComponent {
  onImageError(event: any) {
    // Set a default placeholder image
    event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMDAgMTAwQzIwNSAxMDAgMjEwIDEwNSAyMTAgMTEwVjE5MEMyMTAgMTk1IDIwNSAyMDAgMjAwIDIwMEgxMDBDOTUgMjAwIDkwIDE5NSA5MCAxOTBWMTEwQzkwIDEwNSA5NSAxMDAgMTAwIDEwMEgyMDBaIiBzdHJva2U9IiNDQ0MiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8Y2lyY2xlIGN4PSIxMzAiIGN5PSIxMzAiIHI9IjEwIiBmaWxsPSIjQ0NDIi8+CjxwYXRoIGQ9Ik0xMTAgMTcwTDE0MCAzNDBIMTYwTDE5MCAzNzBIMjQwIiBzdHJva2U9IiNDQ0MiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPgo8L3N2Zz4=';
  }
}