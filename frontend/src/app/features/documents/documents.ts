import { Component } from '@angular/core';
<<<<<<< HEAD

import { AddDocument } from './add-document/add-document';
=======
import { RouterLink } from '@angular/router';

>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
import { ViewDocuments } from './view-documents/view-documents';

@Component({
  selector: 'app-documents',
<<<<<<< HEAD
  imports: [
    AddDocument,
    ViewDocuments
  ],
  templateUrl: './documents.html',
  styleUrl: './documents.css'
})
export class Documents {}
=======
  imports: [RouterLink, ViewDocuments],
  templateUrl: './documents.html',
  styleUrl: './documents.css'
})
export class Documents {}
>>>>>>> 9459a5f (major  update with rebranding, authentication, and UI improvements)
