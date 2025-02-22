import React, { useState } from "react";
import { jsPDF } from "jspdf";
import "./App.css";

interface ImagePart {
  dataUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<number>(20); // Default grid size (20x20)
  const [numGroups, setNumGroups] = useState<number>(5); // Default number of groups
  const [loading, setLoading] = useState<boolean>(false); // Loading state for the button

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const divideAndExportPDF = async () => {
    if (!image) {
      alert("Please upload an image first.");
      return;
    }

    setLoading(true);

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = image;

    img.onload = async () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);

      const cellWidth = img.width / gridSize;
      const cellHeight = img.height / gridSize;
      const totalParts = gridSize * gridSize;

      // Assign parts to groups in a balanced way
      let partAssignments: number[] = [];
      for (let i = 0; i < totalParts; i++) {
        partAssignments.push(i % numGroups);
      }

      // Shuffle the assignments to randomize the distribution
      partAssignments = shuffleArray(partAssignments);

      // Create an array to hold the image parts for each group
      const newGroups: ImagePart[][] = Array.from(
        { length: numGroups },
        () => []
      );

      // Loop through each grid cell
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const left = x * cellWidth;
          const top = y * cellHeight;

          // Create a canvas for the current cell
          const cellCanvas = document.createElement("canvas");
          cellCanvas.width = cellWidth;
          cellCanvas.height = cellHeight;
          const cellCtx = cellCanvas.getContext("2d");

          // Draw the current cell onto the new canvas
          cellCtx?.drawImage(
            canvas,
            left,
            top,
            cellWidth,
            cellHeight,
            0,
            0,
            cellWidth,
            cellHeight
          );

          // Determine which group this part belongs to
          const partIndex = y * gridSize + x;
          const assignedGroup = partAssignments[partIndex];

          // Add the image data URL and position to the assigned group
          newGroups[assignedGroup].push({
            dataUrl: cellCanvas.toDataURL(),
            x: left,
            y: top,
            width: cellWidth,
            height: cellHeight,
          });
        }
      }

      // Generate combined images for each group and export as PDF
      await exportAsPDF(newGroups, img.width, img.height);
      setLoading(false);
    };
  };

  const shuffleArray = (array: number[]): number[] => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const exportAsPDF = async (
    groups: ImagePart[][],
    imgWidth: number,
    imgHeight: number
  ) => {
    // Create a new PDF document
    const pdf = new jsPDF("p", "mm", "a4"); // A4 size, portrait orientation

    for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
      const group = groups[groupIndex];

      // Create a canvas to combine all parts of the group
      const combinedCanvas = document.createElement("canvas");
      combinedCanvas.width = imgWidth;
      combinedCanvas.height = imgHeight;
      const combinedCtx = combinedCanvas.getContext("2d");

      // Check if combinedCtx is not null
      if (!combinedCtx) {
        alert("Failed to create canvas context.");
        return;
      }

      // Fill the canvas with a white background
      combinedCtx.fillStyle = "white";
      combinedCtx.fillRect(0, 0, imgWidth, imgHeight);

      // Wait for all images in the group to load
      await Promise.all(
        group.map(
          (part) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.src = part.dataUrl;
              img.onload = () => {
                combinedCtx.drawImage(
                  img,
                  part.x,
                  part.y,
                  part.width,
                  part.height
                );
                resolve();
              };
            })
        )
      );

      // Convert the combined canvas to a data URL
      const imgData = combinedCanvas.toDataURL("image/jpeg", 1.0);

      // Add a new page for each group after the first
      if (groupIndex > 0) {
        pdf.addPage();
      }

      // Calculate dimensions to fit the image on the A4 page
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const width = imgWidth * ratio;
      const height = imgHeight * ratio;

      // Add the image to the PDF
      pdf.addImage(
        imgData,
        "JPEG",
        (pageWidth - width) / 2,
        (pageHeight - height) / 2,
        width,
        height
      );
    }

    pdf.save("combined_images.pdf");
  };

  return (
    <div className="app-container">
      <button
        className="github-button"
        onClick={() =>
          window.open("https://github.com/itsramin/printTheLetter", "_blank")
        }
      >
        <svg height="20" width="20" viewBox="0 0 16 16" fill="white">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        View on GitHub
      </button>

      <h1 className="app-title">Revive the Art of Letter Writing</h1>
      <div className="app-description">
        <p>
          In a world dominated by digital communication, the charm of physical
          letters is often lost. This tool allows you to create a unique,
          mysterious letter experience. Upload your letter as an image, and
          we'll convert it into a PDF where the content is divided into multiple
          parts. The receiver will need to print all pages and overlay them to
          reveal the original message. Bring back the joy of receiving and
          decoding a personal, handwritten letter!
        </p>
      </div>

      <div className="app-content">
        <div className="input-group">
          <label className="input-label">Upload Your Letter as an Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="file-input"
          />
        </div>
        <div className="input-group">
          <label className="input-label">Grid Size:</label>
          <input
            type="number"
            value={gridSize}
            onChange={(e) => setGridSize(parseInt(e.target.value))}
            className="number-input"
          />
        </div>
        <div className="input-group">
          <label className="input-label">Number of Pages:</label>
          <input
            type="number"
            value={numGroups}
            onChange={(e) => setNumGroups(parseInt(e.target.value))}
            className="number-input"
          />
        </div>
        <button
          onClick={divideAndExportPDF}
          disabled={loading}
          className="action-button"
        >
          {loading ? "Processing..." : "Create Mystery Letter PDF"}
        </button>
      </div>

      <div className="print-instruction">
        <h3>Important Printing Instructions:</h3>
        <p>
          <strong>
            Print all pages of the PDF on a single sheet of paper.
          </strong>{" "}
          Overlay the printed pages to reveal the original message. This ensures
          the letter remains a mystery until the pages are combined!
        </p>
      </div>
    </div>
  );
}

export default App;
