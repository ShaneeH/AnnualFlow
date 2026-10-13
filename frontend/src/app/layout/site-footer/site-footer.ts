import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.css'
})
export class SiteFooter {
  readonly year = new Date().getFullYear();
  readonly repoUrl = 'https://github.com/ShaneeH/senus-board-reporting';
  readonly licenceUrl = 'https://github.com/ShaneeH/senus-board-reporting/blob/main/LICENSE';
}
