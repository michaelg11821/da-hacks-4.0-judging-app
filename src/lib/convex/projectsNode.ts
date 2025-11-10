"use node";

import { projectsLink } from "../constants/projects";
import { internalAction } from "./_generated/server";

import { parse } from "node-html-parser";

async function getRemainingMembers(knownMembers: string[], devpostUrl: string) {
  const res = await fetch(devpostUrl);
  const asText = await res.text();
  const root = parse(asText);

  const profileLinks = root.querySelectorAll(".columns .user-profile-link");

  const knownMembersSet = new Set(Array.from(knownMembers));
  const teamMembers = Array.from(profileLinks)
    .filter((link) => link.textContent !== " ")
    .map((link) => link.textContent);

  const allMembersSet = new Set(teamMembers);

  const complementArr = [...allMembersSet].filter(
    (member) => !knownMembersSet.has(member)
  );

  return complementArr.filter((member) => member !== "");
}

export const importFromDevpost = internalAction({
  handler: async () => {
    const devpostProjects = [];

    let pageNumber = 1;
    let moreProjects = true;

    while (moreProjects) {
      const res = await fetch(`${projectsLink}?page=${pageNumber}`);

      const asText = await res.text();

      const root = parse(asText);
      const gallery = root.querySelector("#submission-gallery");

      if (!gallery)
        return {
          success: false,
          message:
            "Failed to obtain projects from Devpost. There may be no projects submitted.",
          projects: [],
        };

      const childParagraph = gallery.querySelector("p");

      if (
        childParagraph?.textContent ===
        "There are no submissions which match your criteria."
      ) {
        moreProjects = false;
      }

      const projectCards = gallery.querySelectorAll(".gallery-item");

      for (const card of projectCards) {
        const devpostLink = card.querySelector(".link-to-software");
        const name = card.querySelector("h5");

        const teamMemberPhotos = card.querySelectorAll(".user-photo");
        const memberOverflow =
          card.querySelector(".member-overflow")?.lastChild;

        const devpostUrl = devpostLink
          ? (devpostLink.getAttribute("href") ?? "")
          : "";

        const devpostId = devpostUrl !== "" ? devpostUrl.split("/")[4] : "";

        const teamMembers = Array.from(teamMemberPhotos).map((photo) =>
          photo
            ? (photo.getAttribute("alt") ?? "Unknown Member")
            : "Unknown Member"
        );

        if (memberOverflow) {
          const teamMembersCopy = [...teamMembers];

          const remainingMembers = await getRemainingMembers(
            teamMembersCopy,
            devpostUrl
          );

          remainingMembers.forEach((member) => teamMembers.push(member));
        }

        devpostProjects.push({
          devpostUrl,
          devpostId,
          name: name ? name.textContent.trim() : "",
          hasPresented: false,
          teamMembers,
        });
      }

      pageNumber += 1;
    }

    return {
      success: true,
      message: "Successfully scraped projects from Devpost.",
      projects: devpostProjects,
    };
  },
});
