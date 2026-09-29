import Hero from '../components/home/Hero'
import ProductStory from '../components/home/ProductStory'
import AssistantShowcase from '../components/home/AssistantShowcase'
import ProjectsAgentsShowcase from '../components/home/ProjectsAgentsShowcase'
import CommandCenterShowcase from '../components/home/CommandCenterShowcase'
import WorkspaceSection from '../components/home/WorkspaceSection'
import FinalCTA from '../components/home/FinalCTA'
import Footer from '../components/Footer'
import './Home.css'

function Home() {
  return (
    <div className="home">
      <Hero />
      <ProductStory />
      <AssistantShowcase />
      <ProjectsAgentsShowcase />
      <CommandCenterShowcase />
      <WorkspaceSection />
      <FinalCTA />
      <Footer />
    </div>
  )
}

export default Home
