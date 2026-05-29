import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";

try {
  const fileContent = fs.readFileSync("umowa_najmu_wzor.docx");
  const zip = new PizZip(fileContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: {
      start: "{{",
      end: "}}"
    }
  });

  doc.render({
    NAJEMCA_IMIE_NAZWISKO: "Jan Kowalski",
    NAJEMCA_MAIL: "jan@kowalski.pl",
    NAJEMCA_TELEFON: "123456789",
    NAJEMCA_MIEJSCE_ZAMELDOWANIA: "Kraków",
    NAJEMCA_PESEL: "",
    MIESZKANIE_ADRES: "Mickiewicza 4/12, Kraków",
    MIESZKANIE_POWIERZCHNIA: "50 m²",
    MIESZKANIE_KSIEGA_WIECZYSTA: "KR1P/00012345/1",
    CZYNSZ_KWOTA: "2500 PLN",
    CZYNSZ_SLOWNIE: "dwa tysiące pięćset PLN",
    KAUCJA_KWOTA: "2500 PLN",
    DATA_ROZPOCZECIA: "2026-06-01",
    DATA_ZAKONCZENIA: "2027-05-31"
  });

  const buf = doc.getZip().generate({ type: "nodebuffer" });
  fs.writeFileSync("Umowa_Test.docx", buf);
  console.log("SUCCESS: Docxtemplater rendered successfully!");
} catch (err) {
  console.error("ERROR:", err);
}
