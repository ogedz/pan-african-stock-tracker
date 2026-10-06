// datasets.js
const items = document.querySelectorAll("#items li");
const details = document.getElementById("details");

// Log each item's data
items.forEach((item) => {
  console.log("Name:", item.dataset.name);
  console.log("Category:", item.dataset.category);
  console.log("Color:", item.dataset.color);
});

// Show details on click
items.forEach((item) => {
  item.addEventListener("click", () => {
    details.innerHTML = `
      <h2>Item Details</h2>
      <p>Name: ${item.dataset.name}</p>
      <p>Category: ${item.dataset.category}</p>
      <p>Color: ${item.dataset.color}</p>
    `;
  });
});
