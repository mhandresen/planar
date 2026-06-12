import { type Category, categoryOf } from "./category.js";
/** Monoline house glyphs, drawn in a 24x24 box, stroked in the resource's accent color. */
const GLYPHS: Record<string, string> = {
  aws_vpc:
    "<path d='M9 4 H6 A2 2 0 0 0 4 6 V9 M15 4 H18 A2 2 0 0 1 20 6 V9 M9 20 H6 A2 2 0 0 1 4 18 V15 M15 20 H18 A2 2 0 0 0 20 18 V15'/>",
  aws_subnet: "<rect x='5' y='5' width='14' height='14' rx='2'/><path d='M5 12 H19 M12 5 V19'/>",
  aws_internet_gateway:
    "<circle cx='12' cy='12' r='7.5'/><path d='M4.5 12 H19.5'/><path d='M12 4.5 C8 8 8 16 12 19.5 C16 16 16 8 12 4.5 Z'/>",
  aws_nat_gateway: "<path d='M5 9 H15 M12 6 L15 9 L12 12 M19 15 H9 M12 18 L9 15 L12 12'/>",
  aws_eip:
    "<path d='M12 21 C12 21 5.5 14.5 5.5 9.5 A6.5 6.5 0 0 1 18.5 9.5 C18.5 14.5 12 21 12 21 Z'/><circle cx='12' cy='9.5' r='2.3'/>",
  aws_lb:
    "<circle cx='6' cy='12' r='2'/><circle cx='18' cy='6' r='2'/><circle cx='18' cy='12' r='2'/><circle cx='18' cy='18' r='2'/><path d='M8 12 H13 M16 6 H13 V18 H16 M13 12 H16'/>",
  aws_instance:
    "<rect x='4' y='5.5' width='16' height='5.5' rx='1.4'/><rect x='4' y='13' width='16' height='5.5' rx='1.4'/><path d='M7 8.2 H7.01 M7 15.8 H7.01'/>",
  aws_db_instance:
    "<ellipse cx='12' cy='6' rx='7' ry='2.6'/><path d='M5 6 V18 C5 19.4 8.1 20.6 12 20.6 C15.9 20.6 19 19.4 19 18 V6'/><path d='M5 12 C5 13.4 8.1 14.6 12 14.6 C15.9 14.6 19 13.4 19 12'/>",
  aws_s3_bucket:
    "<path d='M5 7 H19 L17.4 18.5 C17.2 19.8 14.9 20.5 12 20.5 C9.1 20.5 6.8 19.8 6.6 18.5 Z'/><ellipse cx='12' cy='7' rx='7' ry='1.9'/>",
};

const FALLBACK = "<rect x='5' y='5' width='14' height='14' rx='3'/>";

/** Generic glyph per category, so an unmapped type still reads as its kind rather than a blank box. */
const CATEGORY_GLYPHS: Record<Category, string> = {
  compute:
    "<rect x='6' y='6' width='12' height='12' rx='1.5'/><path d='M9 3 V6 M15 3 V6 M9 18 V21 M15 18 V21 M3 9 H6 M3 15 H6 M18 9 H21 M18 15 H21'/>",
  storage: "<path d='M4 8 L12 4 L20 8 L12 12 Z'/><path d='M4 8 V16 L12 20 V12'/><path d='M20 8 V16 L12 20'/>",
  database:
    "<ellipse cx='12' cy='6' rx='7' ry='2.6'/><path d='M5 6 V18 C5 19.4 8.1 20.6 12 20.6 C15.9 20.6 19 19.4 19 18 V6'/><path d='M5 12 C5 13.4 8.1 14.6 12 14.6 C15.9 14.6 19 13.4 19 12'/>",
  network:
    "<circle cx='12' cy='5' r='2'/><circle cx='5' cy='18' r='2'/><circle cx='19' cy='18' r='2'/><path d='M12 7 V11 M12 13 L6 16 M12 13 L18 16'/>",
  security: "<rect x='5' y='11' width='14' height='9' rx='1.5'/><path d='M8 11 V8 A4 4 0 0 1 16 8 V11'/>",
  integration: "<rect x='4' y='7' width='16' height='10' rx='1.5'/><path d='M4 9 L12 13 L20 9'/>",
  other: FALLBACK,
};

export function icon(type: string, color: string, x: number, cy: number, size = 22): string {
  const glyph = GLYPHS[type] ?? CATEGORY_GLYPHS[categoryOf(type)];
  const top = cy - size / 2;
  return (
    `<g transform="translate(${x},${top}) scale(${size / 24})" fill="none" stroke="${color}"` +
    ` stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>`
  );
}
