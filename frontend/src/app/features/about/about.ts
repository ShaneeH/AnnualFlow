import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  imports: [RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {
  readonly repoUrl = 'https://github.com/ShaneeH/senus-board-reporting';
  readonly issuesUrl = 'https://github.com/ShaneeH/senus-board-reporting/issues';
}
