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
  const [gridSize, setGridSize] = useState<number>(20); // Default grid size (4x4)
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

    // Save the PDF
    pdf.save("combined_images.pdf");
    alert("PDF exported successfully!");
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Print the Letter</h1>
      <div className="app-content">
        <div className="input-group">
          <label className="input-label">Upload Image:</label>
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
          <label className="input-label">Number of Groups:</label>
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
          {loading ? "Processing..." : "Divide and Export PDF"}
        </button>
      </div>
    </div>
  );
}

export default App;
