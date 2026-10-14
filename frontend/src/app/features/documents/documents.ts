import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ViewDocuments } from './view-documents/view-documents';

@Component({
  selector: 'app-documents',
  imports: [RouterLink, ViewDocuments],
  templateUrl: './documents.html',
  styleUrl: './documents.css'
})
export class Documents {}
