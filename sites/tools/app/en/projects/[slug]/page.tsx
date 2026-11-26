import { detailRoute } from "@/components/SiteRoutes";

const route = detailRoute("project", "en");
export const dynamicParams = false;
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
