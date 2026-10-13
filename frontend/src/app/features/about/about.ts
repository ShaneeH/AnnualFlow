import { Component } from '@angular/core';
<<<<<<< HEAD

@Component({
  selector: 'app-about',
  imports: [],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {}
=======
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
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
