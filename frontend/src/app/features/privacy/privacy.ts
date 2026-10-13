import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy',
  imports: [RouterLink],
  templateUrl: './privacy.html',
  styleUrl: './privacy.css'
})
export class Privacy {
  readonly repoUrl = 'https://github.com/ShaneeH/senus-board-reporting';
}
