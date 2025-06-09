
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import SocialFeed from "@/components/SocialFeed";
import GroupsPreview from "@/components/GroupsPreview";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <SocialFeed />
      <GroupsPreview />
      <Footer />
    </div>
  );
};

export default Index;
