import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AddDocument } from '../add-document/add-document';

/** Dedicated page for the upload flow (/documents/new). */
@Component({
  selector: 'app-new-document',
  imports: [AddDocument, RouterLink],
  templateUrl: './new-document.html',
  styleUrl: './new-document.css'
})
export class NewDocument {}
