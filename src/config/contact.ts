export interface ContactConfig {
  phones: {
    display: string
    link: string
  }[]
  email: string
  googleMapsUrl: string
  hours: string
  delivery: string
  address: string
  addressAr: string
  socials: {
    instagram: string
    tiktok: string
    facebook: string
    whatsapp: string
  }
}

export const contactConfig: ContactConfig = {
  phones: [
    { display: "+216 29 613 681", link: "+21629613681" },
    { display: "+216 58 272 171", link: "+21658272171" }
  ],
  email: "glowpara75@gmail.com",
  googleMapsUrl: "https://maps.app.goo.gl/46PvZT1J16yEV9tN6",
  hours: "7j/7 · 09h30 - 22h00",
  delivery: "partout en Tunisie",
  address: "Route de Morneg km7, El Yasminette, Ben Arous - 2096",
  addressAr: "طريق مرناق كم 7، الياسمينات، بن عروس - 2096",
  socials: {
    instagram: "https://www.instagram.com/para_glow_fs?igsh=MWo2ajhja2NqZmkxaQ==",
    tiktok: "https://www.tiktok.com/@helafkihe?_r=1&_t=ZS-97VpPzTN0Fk",
    facebook: "https://www.facebook.com/profile.php?id=61591658786356&mibextid=wwXIfr",
    whatsapp: "https://wa.me/21629613681"
  }
}
