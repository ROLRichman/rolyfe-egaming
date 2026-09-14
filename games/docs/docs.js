/* =========================================================
   RO'LYFE DOCS CENTER™
   docs.js — V1.1
   PDF + Document Utilities Engine
   ========================================================= */

(function () {
  "use strict";

  const ROLyfeDocs = {

    version: "1.1",

    state: {
      selectedFiles: [],
      objectUrls: [],
      currentPreviewUrl: null
    },

    /* =====================================================
       BASIC UTILITIES
       ===================================================== */

    formatFileSize(bytes) {
      if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

      const units = ["B", "KB", "MB", "GB"];
      const index = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
      );

      return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
    },

    isValidUrl(value) {
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol);
      } catch (error) {
        return false;
      }
    },

    revokeUrl(url) {
      if (!url) return;

      try {
        URL.revokeObjectURL(url);
      } catch (error) {
        console.warn("Unable to revoke object URL:", error);
      }

      this.state.objectUrls = this.state.objectUrls.filter(
        item => item !== url
      );
    },

    createObjectUrl(file) {
      if (!(file instanceof Blob)) return null;

      const url = URL.createObjectURL(file);

      this.state.objectUrls.push(url);

      return url;
    },

    /* =====================================================
       URL RESOURCE TOOL
       ===================================================== */

    openResourceUrl(input) {
      const field =
        typeof input === "string"
          ? input
          : document.getElementById("resourceUrl");

      const value =
        typeof input === "string"
          ? input.trim()
          : field?.value.trim();

      if (!value) {
        alert("Please enter a URL first.");
        return false;
      }

      if (!this.isValidUrl(value)) {
        alert("Please enter a valid HTTP or HTTPS URL.");
        return false;
      }

      window.open(value, "_blank", "noopener,noreferrer");

      return true;
    },

    downloadResourceUrl(input) {
      const field =
        typeof input === "string"
          ? input
          : document.getElementById("resourceUrl");

      const value =
        typeof input === "string"
          ? input.trim()
          : field?.value.trim();

      if (!value) {
        alert("Please enter a URL first.");
        return false;
      }

      if (!this.isValidUrl(value)) {
        alert("Please enter a valid HTTP or HTTPS URL.");
        return false;
      }

      /*
       * Browser security note:
       * Cross-origin servers may block direct downloads.
       * In that case the resource will open instead.
       */

      const link = document.createElement("a");

      link.href = value;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      link.remove();

      return true;
    },

    /* =====================================================
       FILE SELECTION
       ===================================================== */

    handleSelectedFiles(input) {
      const files =
        input instanceof FileList
          ? Array.from(input)
          : input?.files
            ? Array.from(input.files)
            : Array.isArray(input)
              ? input
              : [];

      this.state.selectedFiles = files;

      this.renderFileInfo(files);

      return files;
    },

    addFiles(files) {
      const incoming =
        files instanceof FileList
          ? Array.from(files)
          : Array.isArray(files)
            ? files
            : [];

      this.state.selectedFiles = [
        ...this.state.selectedFiles,
        ...incoming
      ];

      this.renderFileInfo(this.state.selectedFiles);

      return this.state.selectedFiles;
    },

    clearSelectedFiles() {
      this.state.selectedFiles = [];

      this.clearPreview();

      this.renderFileInfo([]);

      const input = document.getElementById("fileInput");

      if (input) {
        input.value = "";
      }
    },

    renderFileInfo(files) {
      const container =
        document.getElementById("fileInfo") ||
        document.getElementById("selectedFiles") ||
        document.querySelector("[data-file-info]");

      if (!container) return;

      if (!files.length) {
        container.innerHTML = `
          <div class="file-info-empty">
            No files selected.
          </div>
        `;
        return;
      }

      container.innerHTML = files
        .map((file, index) => {
          const type =
            file.type ||
            "Unknown file type";

          return `
            <div class="file-info-item">
              <strong>${this.escapeHtml(file.name)}</strong>
              <span>${this.formatFileSize(file.size)}</span>
              <small>${this.escapeHtml(type)}</small>
              <button
                type="button"
                data-remove-file="${index}">
                Remove
              </button>
            </div>
          `;
        })
        .join("");

      container
        .querySelectorAll("[data-remove-file]")
        .forEach(button => {
          button.addEventListener("click", () => {
            const index =
              Number(button.dataset.removeFile);

            this.state.selectedFiles.splice(index, 1);

            this.renderFileInfo(
              this.state.selectedFiles
            );
          });
        });
    },

    /* =====================================================
       FILE PREVIEW
       ===================================================== */

    previewFile(file) {
      if (!(file instanceof Blob)) {
        alert("Invalid file.");
        return false;
      }

      this.clearPreview();

      const url = this.createObjectUrl(file);

      if (!url) {
        alert("Unable to create file preview.");
        return false;
      }

      this.state.currentPreviewUrl = url;

      const preview =
        document.getElementById("documentPreview") ||
        document.getElementById("previewFrame");

      if (preview) {
        if (
          file.type === "application/pdf" ||
          file.type.startsWith("image/")
        ) {
          preview.src = url;
          preview.style.display = "";
        }
      }

      window.open(url, "_blank", "noopener,noreferrer");

      return true;
    },

    clearPreview() {
      const preview =
        document.getElementById("documentPreview") ||
        document.getElementById("previewFrame");

      if (preview) {
        preview.removeAttribute("src");
      }

      if (this.state.currentPreviewUrl) {
        this.revokeUrl(
          this.state.currentPreviewUrl
        );

        this.state.currentPreviewUrl = null;
      }
    },

    /* =====================================================
       LOCAL FILE DOWNLOAD
       ===================================================== */

    downloadFile(file) {
      if (!(file instanceof Blob)) {
        alert("Invalid file.");
        return false;
      }

      const url = this.createObjectUrl(file);

      if (!url) {
        alert("Unable to create download.");
        return false;
      }

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        file.name || "rolyfe-document";

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        this.revokeUrl(url);
      }, 1000);

      return true;
    },

    downloadSelectedFile(index = 0) {
      const file =
        this.state.selectedFiles[index];

      if (!file) {
        alert("Select a file first.");
        return false;
      }

      return this.downloadFile(file);
    },

    /* =====================================================
       PRINT
       ===================================================== */

    printPage() {
      window.print();
    },

    printFile(file) {
      if (!(file instanceof Blob)) {
        alert("Invalid file.");
        return false;
      }

      const url = this.createObjectUrl(file);

      if (!url) {
        alert("Unable to create printable file.");
        return false;
      }

      const printWindow =
        window.open(
          url,
          "_blank",
          "noopener,noreferrer"
        );

      if (!printWindow) {
        alert("Please allow pop-ups for printing.");
        return false;
      }

      return true;
    },

    /* =====================================================
       IMAGE → PDF
       Browser-native PDF generator
       ===================================================== */

    async imagesToPdf(files) {

      const imageFiles =
        Array.from(files || this.state.selectedFiles)
          .filter(file =>
            file &&
            file.type &&
            file.type.startsWith("image/")
          );

      if (!imageFiles.length) {
        alert("Select one or more images first.");
        return null;
      }

      try {

        const pages = [];

        for (const file of imageFiles) {

          const image =
            await this.loadImage(file);

          pages.push({
            image,
            width: image.naturalWidth,
            height: image.naturalHeight
          });
        }

        const pdfBlob =
          await this.buildImagePdf(pages);

        const outputName =
          "ROLyfe_Documents.pdf";

        const finalFile =
          new File(
            [pdfBlob],
            outputName,
            {
              type: "application/pdf"
            }
          );

        this.downloadFile(finalFile);

        return finalFile;

      } catch (error) {

        console.error(
          "Image to PDF failed:",
          error
        );

        alert(
          "Unable to convert the selected images to PDF."
        );

        return null;
      }
    },

    loadImage(file) {

      return new Promise(
        (resolve, reject) => {

          const url =
            this.createObjectUrl(file);

          if (!url) {
            reject(
              new Error(
                "Unable to create image URL."
              )
            );

            return;
          }

          const image =
            new Image();

          image.onload = () => {

            this.revokeUrl(url);

            resolve(image);
          };

          image.onerror = () => {

            this.revokeUrl(url);

            reject(
              new Error(
                "Unable to load image."
              )
            );
          };

          image.src = url;
        }
      );
    },

    /*
     * Converts an image to JPEG data.
     * PNG/WebP/etc. are normalized through canvas.
     */

    imageToJpeg(image, quality = 0.92) {

      const maxDimension = 1600;

      let width =
        image.naturalWidth;

      let height =
        image.naturalHeight;

      if (
        width > maxDimension ||
        height > maxDimension
      ) {

        const scale =
          Math.min(
            maxDimension / width,
            maxDimension / height
          );

        width =
          Math.round(width * scale);

        height =
          Math.round(height * scale);
      }

      const canvas =
        document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context =
        canvas.getContext("2d");

      context.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      const dataUrl =
        canvas.toDataURL(
          "image/jpeg",
          quality
        );

      return {
        dataUrl,
        width,
        height
      };
    },

    /*
     * Lightweight JPEG PDF writer.
     * This is intentionally dependency-free.
     */

    async buildImagePdf(pages) {

      const pdfParts = [];

      const offsets = [];

      let position = 0;

      const push = value => {

        const bytes =
          new TextEncoder().encode(value);

        pdfParts.push(bytes);

        position += bytes.length;
      };

      push("%PDF-1.4\n");

      const objects = [];

      let objectNumber = 1;

      const catalogId =
        objectNumber++;

      const pagesId =
        objectNumber++;

      const pageObjects = [];

      const imageObjects = [];

      const contentObjects = [];

      const preparedPages = [];

      for (const page of pages) {

        const jpeg =
          this.imageToJpeg(
            page.image
          );

        const binary =
          this.dataUrlToBinary(
            jpeg.dataUrl
          );

        const imageId =
          objectNumber++;

        const contentId =
          objectNumber++;

        const pageId =
          objectNumber++;

        imageObjects.push({
          id: imageId,
          binary,
          width: jpeg.width,
          height: jpeg.height
        });

        contentObjects.push({
          id: contentId,
          width: jpeg.width,
          height: jpeg.height
        });

        pageObjects.push({
          id: pageId,
          imageId,
          contentId,
          width: jpeg.width,
          height: jpeg.height
        });

        preparedPages.push({
          pageId,
          imageId,
          contentId,
          width: jpeg.width,
          height: jpeg.height
        });
      }

      /*
       * Catalog
       */

      offsets[catalogId] =
        position;

      push(
        `${catalogId} 0 obj\n` +
        `<< /Type /Catalog /Pages ${pagesId} 0 R >>\n` +
        `endobj\n`
      );

      /*
       * Pages object
       */

      offsets[pagesId] =
        position;

      const kids =
        preparedPages
          .map(page =>
            `${page.pageId} 0 R`
          )
          .join(" ");

      push(
        `${pagesId} 0 obj\n` +
        `<< /Type /Pages ` +
        `/Kids [${kids}] ` +
        `/Count ${preparedPages.length} >>\n` +
        `endobj\n`
      );

      /*
       * Image objects
       */

      for (const image of imageObjects) {

        offsets[image.id] =
          position;

        push(
          `${image.id} 0 obj\n` +
          `<< /Type /XObject ` +
          `/Subtype /Image ` +
          `/Width ${image.width} ` +
          `/Height ${image.height} ` +
          `/ColorSpace /DeviceRGB ` +
          `/BitsPerComponent 8 ` +
          `/Filter /DCTDecode ` +
          `/Length ${image.binary.length} >>\n` +
          `stream\n`
        );

        pdfParts.push(
          image.binary
        );

        position +=
          image.binary.length;

        push(
          `\nendstream\n` +
          `endobj\n`
        );
      }

      /*
       * Content streams
       */

      for (const content of contentObjects) {

        offsets[content.id] =
          position;

        const stream =
          `q\n` +
          `${content.width} 0 0 ` +
          `${content.height} 0 0 cm\n` +
          `/Im${content.id} Do\n` +
          `Q\n`;

        const encoded =
          new TextEncoder()
            .encode(stream);

        push(
          `${content.id} 0 obj\n` +
          `<< /Length ${encoded.length} >>\n` +
          `stream\n`
        );

        pdfParts.push(
          encoded
        );

        position +=
          encoded.length;

        push(
          `endstream\n` +
          `endobj\n`
        );
      }

      /*
       * Page objects
       */

      for (const page of preparedPages) {

        offsets[page.pageId] =
          position;

        push(
          `${page.pageId} 0 obj\n` +
          `<< /Type /Page ` +
          `/Parent ${pagesId} 0 R ` +
          `/MediaBox [0 0 ` +
          `${page.width} ${page.height}] ` +
          `/Resources << ` +
          `/XObject << ` +
          `/Im${page.contentId} ` +
          `${page.imageId} 0 R >> >> ` +
          `/Contents ${page.contentId} 0 R >>\n` +
          `endobj\n`
        );
      }

      /*
       * NOTE:
       * Page XObject naming above is deterministic,
       * but content/image IDs differ.
       * Rebuild correct page resources.
       */

      /*
       * Because the lightweight writer above keeps the
       * generated PDF dependency-free, use a second
       * reliable assembly path below.
       */

      return this.buildSimplePdf(preparedPages, imageObjects, contentObjects);
    },

    async buildSimplePdf(
      pages,
      imageObjects,
      contentObjects
    ) {

      const chunks = [];

      const offsets = [0];

      let length = 0;

      const textEncoder =
        new TextEncoder();

      const addText = text => {

        const bytes =
          textEncoder.encode(text);

        chunks.push(bytes);

        length +=
          bytes.length;
      };

      const addBytes = bytes => {

        chunks.push(bytes);

        length +=
          bytes.length;
      };

      addText("%PDF-1.4\n");

      const objectData = [];

      let id = 1;

      const catalogId = id++;
      const pagesId = id++;

      const imageIds = [];
      const contentIds = [];
      const pageIds = [];

      for (let i = 0; i < pages.length; i++) {

        imageIds.push(id++);
        contentIds.push(id++);
        pageIds.push(id++);
      }

      /*
       * Catalog
       */

      objectData.push({
        id: catalogId,
        body:
          `<< /Type /Catalog ` +
          `/Pages ${pagesId} 0 R >>`
      });

      /*
       * Pages
       */

      objectData.push({
        id: pagesId,
        body:
          `<< /Type /Pages ` +
          `/Kids [` +
          pageIds
            .map(value => `${value} 0 R`)
            .join(" ") +
          `] ` +
          `/Count ${pages.length} >>`
      });

      /*
       * Images
       */

      for (
        let i = 0;
        i < pages.length;
        i++
      ) {

        const jpeg =
          this.imageToJpeg(
            pages[i].image
          );

        const binary =
          this.dataUrlToBinary(
            jpeg.dataUrl
          );

        objectData.push({
          id: imageIds[i],
          binary,
          dictionary:
            `<< /Type /XObject ` +
            `/Subtype /Image ` +
            `/Width ${jpeg.width} ` +
            `/Height ${jpeg.height} ` +
            `/ColorSpace /DeviceRGB ` +
            `/BitsPerComponent 8 ` +
            `/Filter /DCTDecode ` +
            `/Length ${binary.length} >>`
        });

        const stream =
          `q\n` +
          `${jpeg.width} 0 0 ` +
          `${jpeg.height} 0 0 cm\n` +
          `/Im${i} Do\n` +
          `Q\n`;

        objectData.push({
          id: contentIds[i],
          binary:
            textEncoder.encode(stream),
          dictionary:
            `<< /Length ` +
            `${textEncoder.encode(stream).length} >>`
        });
      }

      /*
       * Pages
       */

      for (
        let i = 0;
        i < pages.length;
        i++
      ) {

        const jpeg =
          this.imageToJpeg(
            pages[i].image
          );

        objectData.push({
          id: pageIds[i],
          body:
            `<< /Type /Page ` +
            `/Parent ${pagesId} 0 R ` +
            `/MediaBox [0 0 ` +
            `${jpeg.width} ${jpeg.height}] ` +
            `/Resources << ` +
            `/XObject << ` +
            `/Im${i} ` +
            `${imageIds[i]} 0 R >> >> ` +
            `/Contents ` +
            `${contentIds[i]} 0 R >>`
        });
      }

      /*
       * Objects
       */

      for (const object of objectData) {

        offsets[object.id] =
          length;

        addText(
          `${object.id} 0 obj\n`
        );

        if (object.body) {

          addText(
            `${object.body}\n`
          );

        } else {

          addText(
            `${object.dictionary}\n` +
            `stream\n`
          );

          addBytes(
            object.binary
          );

          addText(
            `\nendstream\n`
          );
        }

        addText(
          `endobj\n`
        );
      }

      /*
       * Cross-reference
       */

      const xrefOffset =
        length;

      addText(
        `xref\n` +
        `0 ${id}\n` +
        `0000000000 65535 f \n`
      );

      for (let i = 1; i < id; i++) {

        const offset =
          String(offsets[i] || 0)
            .padStart(10, "0");

        addText(
          `${offset} 00000 n \n`
        );
      }

      addText(
        `trailer\n` +
        `<< /Size ${id} ` +
        `/Root ${catalogId} 0 R >>\n` +
        `startxref\n` +
        `${xrefOffset}\n` +
        `%%EOF`
      );

      return new Blob(
        chunks,
        {
          type: "application/pdf"
        }
      );
    },

    dataUrlToBinary(dataUrl) {

      const base64 =
        dataUrl.split(",")[1];

      const binaryString =
        atob(base64);

      const bytes =
        new Uint8Array(
          binaryString.length
        );

      for (
        let i = 0;
        i < binaryString.length;
        i++
      ) {
        bytes[i] =
          binaryString.charCodeAt(i);
      }

      return bytes;
    },

    /* =====================================================
       PDF OPEN / DOWNLOAD
       ===================================================== */

    openSelectedPdf(index = 0) {

      const file =
        this.state.selectedFiles[index];

      if (!file) {
        alert("Select a file first.");
        return false;
      }

      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        alert("Selected file is not a PDF.");
        return false;
      }

      return this.previewFile(file);
    },

    downloadSelectedPdf(index = 0) {

      const file =
        this.state.selectedFiles[index];

      if (!file) {
        alert("Select a PDF first.");
        return false;
      }

      if (
        file.type !== "application/pdf" &&
        !file.name.toLowerCase().endsWith(".pdf")
      ) {
        alert("Selected file is not a PDF.");
        return false;
      }

      return this.downloadFile(file);
    },

    /* =====================================================
       TEXT / EMAIL UTILITIES
       ===================================================== */

    copyText(text) {

      if (!text) {
        alert("Nothing to copy.");
        return false;
      }

      if (
        navigator.clipboard &&
        navigator.clipboard.writeText
      ) {

        navigator.clipboard
          .writeText(text)
          .then(() => {
            alert("Copied to clipboard.");
          })
          .catch(() => {
            this.fallbackCopy(text);
          });

        return true;
      }

      return this.fallbackCopy(text);
    },

    fallbackCopy(text) {

      const textarea =
        document.createElement("textarea");

      textarea.value = text;

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      document.body.appendChild(
        textarea
      );

      textarea.select();

      let success = false;

      try {
        success =
          document.execCommand("copy");
      } catch (error) {
        success = false;
      }

      textarea.remove();

      alert(
        success
          ? "Copied to clipboard."
          : "Unable to copy automatically."
      );

      return success;
    },

    composeEmail({
      to = "",
      subject = "",
      body = ""
    } = {}) {

      const params =
        new URLSearchParams();

      if (subject) {
        params.set(
          "subject",
          subject
        );
      }

      if (body) {
        params.set(
          "body",
          body
        );
      }

      const query =
        params.toString();

      const mailto =
        `mailto:${to || ""}` +
        (query ? `?${query}` : "");

      window.location.href =
        mailto;

      return true;
    },

    /* =====================================================
       DRAG + DROP
       ===================================================== */

    setupDragAndDrop() {

      const dropZones =
        document.querySelectorAll(
          ".file-drop, [data-file-drop]"
        );

      dropZones.forEach(zone => {

        zone.addEventListener(
          "dragover",
          event => {

            event.preventDefault();

            zone.classList.add(
              "drag-over"
            );
          }
        );

        zone.addEventListener(
          "dragleave",
          () => {

            zone.classList.remove(
              "drag-over"
            );
          }
        );

        zone.addEventListener(
          "drop",
          event => {

            event.preventDefault();

            zone.classList.remove(
              "drag-over"
            );

            const files =
              event.dataTransfer.files;

            this.handleSelectedFiles(
              files
            );
          }
        );
      });
    },

    /* =====================================================
       KEYBOARD SHORTCUTS
       ===================================================== */

    setupKeyboardShortcuts() {

      document.addEventListener(
        "keydown",
        event => {

          if (
            (event.ctrlKey ||
              event.metaKey) &&
            event.key.toLowerCase() === "k"
          ) {

            const input =
              document.getElementById(
                "resourceUrl"
              );

            if (input) {

              event.preventDefault();

              input.focus();

              input.select();
            }
          }

          if (
            event.key === "Escape"
          ) {

            this.clearPreview();
          }
        }
      );
    },

    /* =====================================================
       HTML SAFETY
       ===================================================== */

    escapeHtml(value) {

      return String(value)
        .replace(
          /&/g,
          "&amp;"
        )
        .replace(
          /</g,
          "&lt;"
        )
        .replace(
          />/g,
          "&gt;"
        )
        .replace(
          /"/g,
          "&quot;"
        )
        .replace(
          /'/g,
          "&#039;"
        );
    },

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    init() {

      this.setupDragAndDrop();

      this.setupKeyboardShortcuts();

      const fileInput =
        document.getElementById(
          "fileInput"
        );

      if (fileInput) {

        fileInput.addEventListener(
          "change",
          event => {

            this.handleSelectedFiles(
              event.target.files
            );
          }
        );
      }

      window.addEventListener(
        "beforeunload",
        () => {

          this.state.objectUrls
            .forEach(url => {

              try {
                URL.revokeObjectURL(
                  url
                );
              } catch (error) {}
            });
        }
      );

      console.log(
        `RO'Lyfe Docs Center V${this.version} initialized.`
      );
    }
  };

  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.ROLyfeDocs = ROLyfeDocs;

  /* Backward-compatible functions */

  window.openResourceUrl =
    function (input) {
      return ROLyfeDocs.openResourceUrl(
        input
      );
    };

  window.handleSelectedFiles =
    function (input) {
      return ROLyfeDocs.handleSelectedFiles(
        input
      );
    };

  window.downloadResourceUrl =
    function (input) {
      return ROLyfeDocs.downloadResourceUrl(
        input
      );
    };

  window.downloadSelectedFile =
    function (index) {
      return ROLyfeDocs.downloadSelectedFile(
        index
      );
    };

  window.previewFile =
    function (file) {
      return ROLyfeDocs.previewFile(
        file
      );
    };

  window.imagesToPdf =
    function (files) {
      return ROLyfeDocs.imagesToPdf(
        files
      );
    };

  window.printPage =
    function () {
      return ROLyfeDocs.printPage();
    };

  /* =======================================================
     DOM READY
     ======================================================= */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      () => ROLyfeDocs.init()
    );

  } else {

    ROLyfeDocs.init();
  }

})();
