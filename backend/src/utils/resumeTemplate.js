
function buildResumeHTML(data) {

    // 🔹 Normalize
    data.skills = Array.isArray(data.skills)
        ? data.skills
        : typeof data.skills === "string"
            ? data.skills.split(",").map(s => s.trim())
            : [];

    data.experience = Array.isArray(data.experience) ? data.experience : [];
    data.projects = Array.isArray(data.projects) ? data.projects : [];
    data.education = Array.isArray(data.education) ? data.education : [];

    return `
    <html>
    <body style="font-family: 'Helvetica', Arial, sans-serif; margin: 0; padding: 0; background: #fff;">

    <div style="max-width: 850px; margin: auto; padding: 40px;">

        <!-- HEADER -->
        <h1 style="margin: 0; font-size: 32px; font-weight: bold;">
            ${data.name || ""}
        </h1>

        <p style="margin: 5px 0 15px 0; font-size: 14px;">
            ${data.email || ""} • ${data.phone || ""}
        </p>

        <!-- SECTION -->
        ${section("SUMMARY", `
            <p>${data.summary || ""}</p>
        `)}

        ${section("TECHNICAL SKILLS", `
            <p>${data.skills.join(", ")}</p>
        `)}

        ${section("EXPERIENCE", data.experience.map(exp => `
            <div style="margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between;">
                    <b>${exp.role || ""}</b>
                    <span>${exp.company || ""}</span>
                </div>
                <ul style="margin: 5px 0 0 15px;">
                    <li>${exp.description || ""}</li>
                </ul>
            </div>
        `).join(""))}

        ${section("PROJECTS", data.projects.map(p => `
            <div style="margin-bottom: 10px;">
                <b>${p.name || ""}</b>
                <ul style="margin: 5px 0 0 15px;">
                    <li>${p.description || ""}</li>
                </ul>
            </div>
        `).join(""))}

        ${section("EDUCATION", data.education.map(ed => `
            <div style="margin-bottom: 8px;">
                <b>${ed.degree || ""}</b><br/>
                ${ed.institute || ""}
            </div>
        `).join(""))}

    </div>

    </body>
    </html>
    `;
}


// 🔹 Section Helper (Overleaf Style)
function section(title, content) {
    return `
        <div style="margin-top: 20px;">
            <h2 style="
                font-size: 14px;
                letter-spacing: 1px;
                font-weight: bold;
                border-bottom: 1px solid black;
                padding-bottom: 3px;
                margin-bottom: 10px;
            ">
                ${title}
            </h2>
            ${content}
        </div>
    `;
}

module.exports = buildResumeHTML;