import { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EmployerQuestionsModal } from "./EmployerQuestionsModal";
import { MapPin, Building, DollarSign, Clock, Users, Search, Briefcase, Filter, ChevronDown, ChevronUp, X, Star, ExternalLink, ArrowRight, CheckCircle, AlertTriangle, Zap, Eye, RefreshCw, ArrowLeft, Mic, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const FUNNY_MESSAGE_KEYS = [
  "jobPostingsModal.noJobsMessages.msg1",
  "jobPostingsModal.noJobsMessages.msg2",
  "jobPostingsModal.noJobsMessages.msg3",
  "jobPostingsModal.noJobsMessages.msg4",
  "jobPostingsModal.noJobsMessages.msg5",
  "jobPostingsModal.noJobsMessages.msg6",
  "jobPostingsModal.noJobsMessages.msg7",
  "jobPostingsModal.noJobsMessages.msg8",
  "jobPostingsModal.noJobsMessages.msg9",
  "jobPostingsModal.noJobsMessages.msg10",
] as const;

const AI_LOADING_MESSAGE_KEYS = [
  "jobPostingsModal.aiAssistantMessages.msg1",
  "jobPostingsModal.aiAssistantMessages.msg2",
  "jobPostingsModal.aiAssistantMessages.msg3",
  "jobPostingsModal.aiAssistantMessages.msg4",
  "jobPostingsModal.aiAssistantMessages.msg5",
  "jobPostingsModal.aiAssistantMessages.msg6",
  "jobPostingsModal.aiAssistantMessages.msg7",
  "jobPostingsModal.aiAssistantMessages.msg8",
  "jobPostingsModal.aiAssistantMessages.msg9",
] as const;

// Country-City data structure
const COUNTRIES_CITIES = {
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth", "Columbus", "Charlotte", "San Francisco", "Indianapolis", "Seattle", "Denver", "Boston", "Detroit", "Nashville", "Memphis", "Portland", "Oklahoma City", "Las Vegas", "Louisville", "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento", "Mesa", "Kansas City", "Atlanta", "Long Beach", "Colorado Springs", "Raleigh", "Miami", "Virginia Beach", "Omaha", "Oakland", "Minneapolis", "Tulsa", "Arlington", "Tampa", "New Orleans"],
  "Canada": ["Toronto", "Montreal", "Vancouver", "Calgary", "Ottawa", "Edmonton", "Quebec City", "Winnipeg", "Hamilton", "Kitchener", "London", "Victoria", "Halifax", "Oshawa", "Windsor", "Saskatoon", "Regina", "Sherbrooke", "Kelowna", "Barrie", "Abbotsford", "Kingston", "Sudbury", "Saguenay", "Trois-Rivières", "Guelph", "Cambridge", "Whitby", "Brantford", "Thunder Bay"],
  "United Kingdom": ["London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Sheffield", "Edinburgh", "Bristol", "Cardiff", "Belfast", "Newcastle", "Nottingham", "Plymouth", "Stoke-on-Trent", "Wolverhampton", "Derby", "Swansea", "Southampton", "Salford", "Aberdeen", "Westminster", "Portsmouth", "York", "Peterborough", "Dundee", "Lancaster", "Oxford", "Newport", "Preston"],
  "Germany": ["Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf", "Dortmund", "Essen", "Leipzig", "Bremen", "Dresden", "Hanover", "Nuremberg", "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Münster", "Karlsruhe", "Mannheim", "Augsburg", "Wiesbaden", "Gelsenkirchen", "Mönchengladbach", "Braunschweig", "Chemnitz", "Kiel", "Aachen"],
  "France": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon", "Grenoble", "Dijon", "Angers", "Nîmes", "Villeurbanne", "Saint-Denis", "Le Mans", "Aix-en-Provence", "Clermont-Ferrand", "Brest", "Limoges", "Tours", "Amiens", "Perpignan", "Metz"],
  "Italy": ["Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence", "Bari", "Catania", "Venice", "Verona", "Messina", "Padua", "Trieste", "Taranto", "Brescia", "Prato", "Parma", "Modena", "Reggio Calabria", "Reggio Emilia", "Perugia", "Livorno", "Ravenna", "Cagliari", "Foggia", "Rimini", "Salerno", "Ferrara"],
  "Spain": ["Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia", "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Vigo", "Gijón", "Hospitalet", "A Coruña", "Vitoria-Gasteiz", "Granada", "Elche", "Oviedo", "Badalona", "Cartagena", "Terrassa", "Jerez", "Sabadell", "Móstoles", "Santa Cruz", "Pamplona", "Almería"],
  "Netherlands": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Almere", "Breda", "Nijmegen", "Enschede", "Haarlem", "Arnhem", "Zaanstad", "Amersfoort", "Apeldoorn", "s-Hertogenbosch", "Hoofddorp", "Maastricht", "Leiden", "Dordrecht", "Zoetermeer", "Zwolle", "Deventer", "Delft", "Alkmaar", "Leeuwarden", "Venlo", "Hilversum", "Heerlen"],
  "Australia": ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Newcastle", "Canberra", "Sunshine Coast", "Wollongong", "Hobart", "Geelong", "Townsville", "Cairns", "Darwin", "Toowoomba", "Ballarat", "Bendigo", "Albury", "Launceston", "Mackay", "Rockhampton", "Bunbury", "Bundaberg", "Coffs Harbour", "Wagga Wagga", "Hervey Bay", "Mildura", "Shepparton", "Port Macquarie"],
  "Japan": ["Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kawasaki", "Kyoto", "Saitama", "Hiroshima", "Sendai", "Kitakyushu", "Chiba", "Sakai", "Niigata", "Hamamatsu", "Okayama", "Sagamihara", "Kumamoto", "Shizuoka", "Kagoshima", "Matsuyama", "Utsunomiya", "Matsudo", "Kawaguchi", "Kanazawa", "Oita", "Nara", "Toyama"],
  "South Korea": ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Ulsan", "Suwon", "Changwon", "Seongnam", "Goyang", "Yongin", "Bucheon", "Cheongju", "Ansan", "Jeonju", "Anyang", "Cheonan", "Pohang", "Uijeongbu", "Siheung", "Hwaseong", "Gimhae", "Paju", "Iksan", "Pyeongtaek", "Gunsan", "Yangju", "Suncheon", "Chuncheon"],
  "India": ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Patna", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Pimpri-Chinchwad", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Kalyan-Dombivali", "Vasai-Virar", "Varanasi"],
  "China": ["Shanghai", "Beijing", "Chongqing", "Tianjin", "Guangzhou", "Shenzhen", "Wuhan", "Dongguan", "Chengdu", "Nanjing", "Foshan", "Shenyang", "Hangzhou", "Xi'an", "Harbin", "Suzhou", "Qingdao", "Dalian", "Zhengzhou", "Shantou", "Jinan", "Changchun", "Kunming", "Changsha", "Taiyuan", "Xiamen", "Hefei", "Shijiazhuang", "Urumqi", "Zibo"],
  "Brazil": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte", "Manaus", "Curitiba", "Recife", "Goiânia", "Belém", "Porto Alegre", "Guarulhos", "Campinas", "Nova Iguaçu", "Maceió", "São Luís", "Duque de Caxias", "Natal", "Teresina", "São Bernardo do Campo", "Campo Grande", "Osasco", "Jaboatão dos Guararapes", "Santo André", "João Pessoa", "Ribeirão Preto", "Uberlândia", "Sorocaba", "Contagem"],
  "Mexico": ["Mexico City", "Guadalajara", "Monterrey", "Puebla", "Tijuana", "León", "Juárez", "Zapopan", "Nezahualcóyotl", "Chihuahua", "Naucalpan", "Mérida", "Álvaro Obregón", "San Luis Potosí", "Aguascalientes", "Hermosillo", "Saltillo", "Mexicali", "Culiacán", "Guadalupe", "Acapulco", "Tlalnepantla", "Cancún", "Querétaro", "Chimalhuacán", "Torreón", "Morelia", "Reynosa", "Tlaquepaque", "Playa del Carmen"],
  "Egypt": ["Cairo", "Alexandria", "Giza", "Shubra El Kheima", "Port Said", "Suez", "Luxor", "Mansoura", "El Mahalla El Kubra", "Tanta", "Asyut", "Ismailia", "Fayyum", "Zagazig", "Aswan", "Damietta", "Damanhur", "Minya", "Beni Suef", "Qena", "Sohag", "Hurghada", "6th of October City", "Shibin El Kom", "Banha", "Kafr El Sheikh", "Arish", "Mallawi", "Bilbays", "Mit Ghamr"],
  "Turkey": ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Adana", "Konya", "Gaziantep", "Mersin", "Diyarbakır", "Kayseri", "Eskişehir", "Urfa", "Malatya", "Erzurum", "Van", "Batman", "Elazığ", "Iğdır", "Zonguldak", "Kırıkkale", "Düzce", "Tokat", "Isparta", "Çorum", "Afyon", "Kütahya", "Uşak", "Rize", "Edirne"],
  "Russia": ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Nizhny Novgorod", "Kazan", "Chelyabinsk", "Omsk", "Samara", "Rostov-on-Don", "Ufa", "Krasnoyarsk", "Perm", "Voronezh", "Volgograd", "Krasnodar", "Saratov", "Tyumen", "Tolyatti", "Izhevsk", "Barnaul", "Ulyanovsk", "Irkutsk", "Vladivostok", "Yaroslavl", "Habarovsk", "Makhachkala", "Tomsk", "Orenburg", "Kemerovo"],
  "Argentina": ["Buenos Aires", "Córdoba", "Rosario", "Mendoza", "San Miguel de Tucumán", "La Plata", "Mar del Plata", "Salta", "Santa Fe", "San Juan", "Resistencia", "Santiago del Estero", "Corrientes", "Avellaneda", "Bahía Blanca", "Neuquén", "Formosa", "San Luis", "Posadas", "Quilmes", "Comodoro Rivadavia", "Concordia", "San Nicolás", "San Rafael", "Paraná", "Tandil", "La Rioja", "Río Cuarto", "San Salvador de Jujuy", "Junín"],
  "Poland": ["Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Bydgoszcz", "Lublin", "Katowice", "Białystok", "Gdynia", "Częstochowa", "Radom", "Sosnowiec", "Toruń", "Kielce", "Gliwice", "Zabrze", "Bytom", "Bielsko-Biała", "Olsztyn", "Rzeszów", "Ruda Śląska", "Rybnik", "Tychy", "Gorzów Wielkopolski", "Dąbrowa Górnicza", "Płock", "Elbląg"]
};

interface JobPosting {
  recordId: string; // Keep recordId for existing references, but it should map to id
  id: number;
  title: string;
  description: string;
  requirements: string;
  location?: string;
  salaryRange?: string;
  salaryMin?: number;
  salaryMax?: number;
  employmentType: string;
  workplaceType: string;
  seniorityLevel: string;
  industry: string;
  experienceLevel?: string;
  skills?: string[];
  postedAt?: string; // Change from postedDate
  employerQuestions?: string[]; // Change to array
  aiPrompt?: string;
  companyName: string; // New field from 'jobs' table
}

interface AIMatchResponse {
  matchScore: number;
  isGoodMatch: boolean;
  missingRequirements?: string[];
}

interface JobPostingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialJobTitle?: string;
  initialJobId?: string;
  onStartJobPractice?: (job: JobPosting) => void;
  onStartJobPracticeVoice?: (job: JobPosting) => void;
}

type JobTag = {
  label: string;
  variant?: "default" | "destructive" | "secondary";
};

export function JobPostingsModal({ isOpen, onClose, initialJobTitle, initialJobId, onStartJobPractice, onStartJobPracticeVoice }: JobPostingsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [viewedJobDetails, setViewedJobDetails] = useState<Set<string>>(new Set());
  const [showApplicationAnalysis, setShowApplicationAnalysis] = useState(false);
  const [applicationAnalysis, setApplicationAnalysis] = useState<AIMatchResponse | null>(null);
  const [showAILoadingModal, setShowAILoadingModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiLoadingResult, setAiLoadingResult] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [showEmployerQuestions, setShowEmployerQuestions] = useState(false);
  const [pendingApplication, setPendingApplication] = useState<JobPosting | null>(null);
  const [employerAnswers, setEmployerAnswers] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    workplace: [] as string[],
    country: "",
    city: "",
    area: "",
    careerLevel: "",
    jobCategory: "",
    jobType: "",
    datePosted: ""
  });
  const [expandedFilters, setExpandedFilters] = useState({
    workplace: true,
    country: false,
    city: false,
    area: false,
    careerLevel: false,
    jobCategory: false,
    jobType: false,
    datePosted: false
  });
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>([]);
  const [filterMessage, setFilterMessage] = useState("");
  const [hasExpandedSearch, setHasExpandedSearch] = useState(false);
  const [isFilteringInProgress, setIsFilteringInProgress] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [pendingJobValidated, setPendingJobValidated] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const workplaceOptions = [
    { value: "On-site", label: t("dashboard.onsite") },
    { value: "Remote", label: t("dashboard.remote") },
    { value: "Hybrid", label: t("dashboard.hybrid") },
  ];

  // AI-powered filtering mutation
  const aiFilterMutation = useMutation({
    mutationFn: async (filters: any) => {
      setIsFilteringInProgress(true);
      console.log('🤖 Requesting AI-powered job filtering with filters:', filters);
      const response = await apiRequest("/api/job-postings/filter", {
        method: "POST", 
        body: JSON.stringify({ filters: { ...filters, searchQuery } }),
      });
      return response;
    },
    onSuccess: (data) => {
      console.log('✅ AI filtering completed:', data);
      setFilteredJobs(data.jobs);
      setFilterMessage("");  // Never show filter messages
      setHasExpandedSearch(data.hasExpandedSearch || false);
      setIsFilteringInProgress(false);
      // Removed toast notification - no messages when filtering
    },
    onError: (error: Error) => {
      console.error('❌ AI filtering failed:', error);
      setIsFilteringInProgress(false);
      // Fallback to original job list
      setFilteredJobs(jobPostings);
      setFilterMessage("");
      setHasExpandedSearch(false);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: t("jobPostingsModal.toasts.unauthorizedTitle"),
          description: t("jobPostingsModal.toasts.unauthorizedDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: t("jobPostingsModal.toasts.filteringErrorTitle"),
        description: t("jobPostingsModal.toasts.filteringErrorDescription"),
        variant: "destructive",
      });
    },
  });

  // New application mutation for the updated endpoint
  const newApplicationMutation = useMutation({
    mutationFn: async (data: { job: JobPosting }) => {
      console.log('Submitting job application:', data);
      setShowAILoadingModal(true);
      const response = await apiRequest("/api/job-applications/submit", {
        method: "POST",
        body: JSON.stringify(data),
      });
      console.log('Application response:', response);
      return response;
    },
    onSuccess: (data) => {
      setAiLoadingResult({
        type: 'success',
        message: t("jobPostingsModal.aiResultMessages.success")
      });
      toast({
        title: t("jobPostingsModal.toasts.applicationSuccessTitle"),
        description: t("jobPostingsModal.toasts.applicationSuccessDescription"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setSelectedJob(null);
      resetApplicationState();
    },
    onError: (error: Error) => {
      console.error('Application submission error:', error);
      
      // Check if it's a duplicate application error
      if (error.message.includes('already applied')) {
        setAiLoadingResult({
          type: 'info',
          message: t("jobPostingsModal.aiResultMessages.alreadyApplied")
        });
        toast({
          title: t("jobPostingsModal.toasts.alreadyAppliedTitle"),
          description: t("jobPostingsModal.toasts.alreadyAppliedDescription"),
        });
        return;
      }
      
      if (isUnauthorizedError(error)) {
        setAiLoadingResult({
          type: 'error',
          message: t("jobPostingsModal.aiResultMessages.error").replace("{{message}}", error.message)
        });
        toast({
          title: t("jobPostingsModal.toasts.unauthorizedTitle"), 
          description: t("jobPostingsModal.toasts.unauthorizedDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      setAiLoadingResult({
        type: 'error',
        message: t("jobPostingsModal.aiResultMessages.error").replace("{{message}}", error.message)
      });
      toast({
        title: t("jobPostingsModal.toasts.applicationFailedTitle"),
        description: t("jobPostingsModal.toasts.applicationFailedDescription").replace("{{message}}", error.message),
        variant: "destructive",
      });
    },
  });

  const { data: jobPostings = [], isLoading, error, refetch } = useQuery({
    queryKey: ["/api/job-postings"],
    enabled: isOpen,
    refetchInterval: isOpen ? 30000 : false, // Auto-refresh every 30 seconds when modal is open
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("jobPostingsModal.toasts.unauthorizedTitle"),
          description: t("jobPostingsModal.toasts.unauthorizedDescription"),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t("jobPostingsModal.toasts.loadErrorTitle"),
        description: t("jobPostingsModal.toasts.loadErrorDescription"),
        variant: "destructive",
      });
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ["/api/candidate/profile"],
    enabled: isOpen,
  });

  // Check for pending job application from localStorage
  useEffect(() => {
    if (isOpen && !pendingJobValidated) {
      const stored = localStorage.getItem('pendingJobApplication');
      if (stored) {
        try {
          const data = JSON.parse(stored);
          // Check if timestamp is not older than 7 days
          const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
          if (Date.now() - data.timestamp < sevenDaysInMs) {
            setPendingJobId(data.jobId);
            setPendingJobValidated(true);
          } else {
            // Clear expired pending application
            localStorage.removeItem('pendingJobApplication');
            setPendingJobValidated(true);
          }
        } catch (error) {
          console.error('Failed to parse pending job application:', error);
          localStorage.removeItem('pendingJobApplication');
          setPendingJobValidated(true);
        }
      } else {
        setPendingJobValidated(true);
      }
    }
  }, [isOpen, pendingJobValidated]);

  // Auto-open specific job when modal opens with initial job parameters
  useEffect(() => {
    if (isOpen && initialJobTitle && jobPostings.length > 0 && !selectedJob) {
      // Find the job by title or job ID
      const targetJob = jobPostings.find(job =>
        job.title === initialJobTitle ||
        (initialJobId && job.recordId === initialJobId)
      );

      if (targetJob) {
        setSelectedJob(targetJob);
        setViewedJobDetails(prev => new Set([...prev, targetJob.recordId]));
      }
    }
  }, [isOpen, initialJobTitle, initialJobId, jobPostings, selectedJob]);

  // Clear pending application after user has seen it (when they view details or apply)
  const clearPendingApplication = () => {
    localStorage.removeItem('pendingJobApplication');
    setPendingJobId(null);
  };

  // Reset selectedJob when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedJob(null);
      setFilteredJobs([]);
      setFilterMessage("");
      setHasExpandedSearch(false);
      setPendingJobValidated(false);
      // Clear notification flag when modal closes
      sessionStorage.removeItem('pendingJobNotificationShown');
    }
  }, [isOpen]);

  // Trigger AI filtering when filters or search query change
  useEffect(() => {
    if (isOpen && jobPostings.length > 0) {
      // Check if any filters are active
      const hasActiveFilters = (
        filters.workplace.length > 0 ||
        filters.country !== "" ||
        filters.city !== "" ||
        filters.careerLevel !== "" ||
        filters.jobCategory !== "" ||
        filters.jobType !== "" ||
        filters.datePosted !== "" ||
        searchQuery !== ""
      );

      if (hasActiveFilters) {
        // Apply AI filtering
        aiFilterMutation.mutate(filters);
      } else {
        // No filters active, show all jobs
        setFilteredJobs([]);
        setFilterMessage("");
        setHasExpandedSearch(false);
      }
    }
  }, [filters, searchQuery, jobPostings, isOpen]);

  // Calculate active filters count
  const activeFiltersCount = Object.values(filters).filter(value => 
    Array.isArray(value) ? value.length > 0 : value !== ""
  ).length;

  // Intelligent filtering with OR logic and fallback support
  const getFilteredJobs = () => {
    // Primary filtering with exact matches
    const primaryFiltered = jobPostings.filter((job: JobPosting) => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = (
          job.title.toLowerCase().includes(query) ||
          job.companyName.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.location?.toLowerCase().includes(query) ||
          job.skills?.some(skill => skill.toLowerCase().includes(query))
        );
        if (!matchesSearch) return false;
      }

      // Smart workplace filter with OR logic
      if (filters.workplace.length > 0) {
        const jobWorkplace = job.workplaceType?.toLowerCase() || "";
        const hasWorkplaceMatch = filters.workplace.some(w => {
          const filterValue = w.toLowerCase();
          return (
            jobWorkplace.includes(filterValue) ||
            (filterValue === "on-site" && (jobWorkplace.includes("full time") || jobWorkplace.includes("office"))) ||
            (filterValue === "remote" && jobWorkplace.includes("remote")) ||
            (filterValue === "hybrid" && (jobWorkplace.includes("hybrid") || jobWorkplace.includes("flexible")))
          );
        });
        if (!hasWorkplaceMatch) return false;
      }

      // Smart location filters with partial matching
      if (filters.country && job.location) {
        const locationLower = job.location.toLowerCase();
        const countryLower = filters.country.toLowerCase();
        if (!locationLower.includes(countryLower)) return false;
      }

      if (filters.city && job.location) {
        const locationLower = job.location.toLowerCase();
        const cityLower = filters.city.toLowerCase();
        if (!locationLower.includes(cityLower)) return false;
      }

      // Smart career level filter
      if (filters.careerLevel && job.experienceLevel) {
        const experienceLower = job.experienceLevel.toLowerCase();
        const levelLower = filters.careerLevel.toLowerCase();
        if (!experienceLower.includes(levelLower)) return false;
      }

      // Smart job category filter
      if (filters.jobCategory) {
        const jobCategory = job.industry?.toLowerCase() || job.title.toLowerCase();
        const categoryLower = filters.jobCategory.toLowerCase();
        if (!jobCategory.includes(categoryLower)) return false;
      }

      // Smart job type filter
      if (filters.jobType && job.jobType) {
        const typeLower = job.jobType.toLowerCase();
        const filterTypeLower = filters.jobType.toLowerCase();
        if (!typeLower.includes(filterTypeLower)) return false;
      }

      return true;
    });

    // If we have enough results, return them
    if (primaryFiltered.length >= 3) {
      return { jobs: primaryFiltered, isRelated: false };
    }

    // If filters are active but results are too few, try relaxed filtering
    if (activeFiltersCount > 0) {
      const relaxedFiltered = jobPostings.filter((job: JobPosting) => {
        // Keep search query strict
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch = (
            job.title.toLowerCase().includes(query) ||
            job.companyName.toLowerCase().includes(query) ||
            job.description.toLowerCase().includes(query) ||
            job.location?.toLowerCase().includes(query) ||
            job.skills?.some(skill => skill.toLowerCase().includes(query))
          );
          if (!matchesSearch) return false;
        }

        // Relaxed matching - any filter match counts
        let hasAnyMatch = false;

        // Workplace relaxed matching
        if (filters.workplace.length > 0) {
          const jobWorkplace = job.workplaceType?.toLowerCase() || "";
          const hasWorkplaceMatch = filters.workplace.some(w => {
            const filterValue = w.toLowerCase();
            return (
              jobWorkplace.includes(filterValue) ||
              (filterValue === "on-site" && jobWorkplace.includes("full")) ||
              (filterValue === "remote" && jobWorkplace.includes("remote")) ||
              (filterValue === "hybrid" && jobWorkplace.includes("hybrid"))
            );
          });
          if (hasWorkplaceMatch) hasAnyMatch = true;
        }

        // Country relaxed matching
        if (filters.country && job.location) {
          const locationLower = job.location.toLowerCase();
          const countryLower = filters.country.toLowerCase();
          if (locationLower.includes(countryLower)) hasAnyMatch = true;
        }

        // Career level relaxed matching
        if (filters.careerLevel && job.experienceLevel) {
          const experienceLower = job.experienceLevel.toLowerCase();
          const levelLower = filters.careerLevel.toLowerCase();
          if (experienceLower.includes(levelLower)) hasAnyMatch = true;
        }

        // Job category relaxed matching
        if (filters.jobCategory) {
          const jobCategory = job.industry?.toLowerCase() || job.title.toLowerCase();
          const categoryLower = filters.jobCategory.toLowerCase();
          if (jobCategory.includes(categoryLower)) hasAnyMatch = true;
        }

        // If no filters are active, include all jobs
        if (activeFiltersCount === 0) hasAnyMatch = true;

        return hasAnyMatch;
      });

      // Sort by match score to show best matches first
      const sortedJobs = relaxedFiltered.sort((a, b) => {
        const scoreA = calculateAIMatchScore(a);
        const scoreB = calculateAIMatchScore(b);
        return scoreB - scoreA;
      });

      return { jobs: sortedJobs, isRelated: true };
    }

    // No filters active - return all jobs sorted by match score
    const allJobsSorted = jobPostings.sort((a, b) => {
      const scoreA = calculateAIMatchScore(a);
      const scoreB = calculateAIMatchScore(b);
      return scoreB - scoreA;
    });

    return { jobs: allJobsSorted, isRelated: false };
  };

  // AI Match Score calculation (simplified) - MOVED BEFORE getFilteredJobs
  const calculateAIMatchScore = (job: JobPosting): number => {
    if (!userProfile?.aiProfile) return 50; // Default score when no profile
    
    let score = 0;
    const profile = userProfile.aiProfile;
    
    // Skills matching
    if (job.skills && profile.skills && job.skills.length > 0) {
      const matchingSkills = job.skills.filter(skill => 
        profile.skills.some((userSkill: string) => 
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      score += (matchingSkills.length / job.skills.length) * 40;
    } else {
      // Add base score if no skills specified
      score += 25;
    }
    
    // Experience level matching
    if (job.experienceLevel && profile.experience) {
      const experienceYears = Array.isArray(profile.experience) ? profile.experience.length : 0;
      const jobLevel = job.experienceLevel.toLowerCase();
      if (
        (jobLevel.includes('entry') && experienceYears <= 2) ||
        (jobLevel.includes('junior') && experienceYears <= 3) ||
        (jobLevel.includes('mid') && experienceYears >= 2 && experienceYears <= 5) ||
        (jobLevel.includes('senior') && experienceYears >= 5)
      ) {
        score += 30;
      }
    } else {
      // Add base score if no experience level specified
      score += 15;
    }
    
    // Location preference (if available in profile)
    if (job.location && profile.workStyle) {
      const workStyleStr = typeof profile.workStyle === 'string' ? profile.workStyle : String(profile.workStyle);
      if (workStyleStr.toLowerCase().includes('remote') && job.employmentType?.toLowerCase().includes('remote')) {
        score += 20;
      } else if (workStyleStr.toLowerCase().includes('office') && job.employmentType?.toLowerCase().includes('office')) {
        score += 20;
      }
    } else {
      // Add base score if no location preference
      score += 10;
    }
    
    // Career goals alignment (bonus points)
    if (job.jobDescription && profile.careerGoals) {
      const descriptionLower = job.jobDescription.toLowerCase();
      const goalsLower = profile.careerGoals.toLowerCase();
      if (descriptionLower.includes(goalsLower.split(' ')[0]) || 
          goalsLower.includes(job.jobTitle.toLowerCase().split(' ')[0])) {
        score += 10;
      }
    }
    
    // Ensure score is a valid number
    const finalScore = Math.min(Math.round(score), 100);
    return isNaN(finalScore) ? 50 : finalScore; // Fallback to 50 if NaN
  };

  // Check if any filters are applied
  const hasActiveFilters = !!(
    filters.jobType ||
    (filters.workplace && filters.workplace.length > 0) ||
    filters.country ||
    filters.city ||
    filters.careerLevel ||
    filters.jobCategory ||
    filters.datePosted ||
    searchQuery
  );

  // STRICT FILTERING: If filters are applied, ONLY show filtered results (even if empty)
  // If no filters are applied, show all jobs
  let displayedJobs = hasActiveFilters ? filteredJobs : jobPostings;

  // Pin pending job application to the top if it exists and is valid
  if (pendingJobId && displayedJobs.length > 0) {
    const pendingJob = displayedJobs.find(job => String(job.id) === String(pendingJobId));

    if (pendingJob) {
      // Remove pending job from its current position and add to top with marker
      const jobsWithoutPending = displayedJobs.filter(job => String(job.id) !== String(pendingJobId));
      displayedJobs = [
        { ...pendingJob, isPendingApplication: true } as any,
        ...jobsWithoutPending
      ];
    } else {
      // Job not found in current list - might be inactive or doesn't exist
      // Check if we've already shown the notification
      const notificationShown = sessionStorage.getItem('pendingJobNotificationShown');

      if (!notificationShown) {
        toast({
          title: t("jobPostingsModal.toasts.jobUnavailableTitle"),
          description: t("jobPostingsModal.toasts.jobUnavailableDescription"),
          variant: "destructive",
        });
        sessionStorage.setItem('pendingJobNotificationShown', 'true');
      }

      // Clear the pending application
      localStorage.removeItem('pendingJobApplication');
      setPendingJobId(null);
    }
  }

  const showingRelatedJobs = hasExpandedSearch;

  // Helper functions
  const toggleFilter = (filterType: keyof typeof expandedFilters) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const updateFilter = (filterType: keyof typeof filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const toggleWorkplaceFilter = (value: string) => {
    setFilters(prev => ({
      ...prev,
      workplace: prev.workplace.includes(value)
        ? prev.workplace.filter(w => w !== value)
        : [...prev.workplace, value]
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      workplace: [],
      country: "",
      city: "",
      area: "",
      careerLevel: "",
      jobCategory: "",
      jobType: "",
      datePosted: ""
    });
    setSearchQuery("");
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force refresh the job postings data
      await refetch();
      toast({
        title: t("jobPostingsModal.toasts.refreshedTitle"),
        description: t("jobPostingsModal.toasts.refreshedDescription"),
      });
    } catch (error) {
      toast({
        title: t("jobPostingsModal.toasts.refreshFailedTitle"),
        description: t("jobPostingsModal.toasts.refreshFailedDescription"),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return t("jobPostingsModal.labels.recentlyPosted");
    }
  };

  const getRandomFunnyMessage = () => {
    const messages = FUNNY_MESSAGE_KEYS.map((key) => t(key));
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getRandomAiAssistantMessage = () => {
    const messages = AI_LOADING_MESSAGE_KEYS.map((key) => t(key));
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getJobTags = (job: JobPosting): JobTag[] => {
    const tags: JobTag[] = [];
    if (job.employmentType) tags.push({ label: job.employmentType, variant: "secondary" });
    if (job.experienceLevel) tags.push({ label: job.experienceLevel, variant: "secondary" });
    if (job.postedAt) {
      const daysSincePosted = Math.floor((Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSincePosted <= 3) {
        tags.push({ label: t("jobPostingsModal.badges.new"), variant: "default" });
      }
      if (daysSincePosted <= 1) {
        tags.push({ label: t("jobPostingsModal.badges.urgent"), variant: "destructive" });
      }
    }
    return tags;
  };

  const handleApply = (job: JobPosting) => {
    // Show job details first, then allow application
    setSelectedJob(job);
    setViewedJobDetails(prev => new Set([...prev, job.recordId]));
  };

  const proceedWithApplication = (job: JobPosting) => {
    // Check if job has employer questions
    if (job.employerQuestions && job.employerQuestions.length > 0) {
      // Show employer questions modal
      setPendingApplication(job);
      setShowEmployerQuestions(true);
    } else {
      // Submit application directly if no questions
      submitApplication(job, []);
    }
  };

  const handleEmployerQuestionsSubmit = (answers: string[]) => {
    if (pendingApplication) {
      setEmployerAnswers(answers);
      setShowEmployerQuestions(false);
      submitApplication(pendingApplication, answers);
    }
  };

  const submitApplication = (job: JobPosting, answers: string[]) => {
    // Format answers for notes field
    const notesWithAnswers = answers.length > 0 
      ? `Employer Questions Responses:\n${answers.map((answer, index) => `Q${index + 1}: ${answer}`).join('\n\n')}`
      : '';

    // Use the new job application endpoint with answers in notes
    newApplicationMutation.mutate({ 
      job: {
        ...job,
        notes: notesWithAnswers
      }
    });
  };



  const resetApplicationState = () => {
    setSelectedJob(null);
    setShowApplicationAnalysis(false);
    setApplicationAnalysis(null);
    setShowEmployerQuestions(false);
    setPendingApplication(null);
    setEmployerAnswers([]);
  };



  const showRelatedNotice = showingRelatedJobs && activeFiltersCount > 0;

  const handleClose = () => {
    resetApplicationState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-600" />
              {t("jobPostingsModal.title")} ({displayedJobs.length} {t("jobPostingsModal.matchesLabel")})
            </div>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  {t("jobPostingsModal.buttons.clearFilters")} ({activeFiltersCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1"
                title={t("jobPostingsModal.refreshTitle")}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {t("jobPostingsModal.buttons.refresh")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="hover:bg-gray-100"
                title={t("close")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>



        {/* Loading indicator for AI filtering */}
        {isFilteringInProgress && !filterMessage && (
          <div className="mx-6 mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <p className="text-sm text-gray-700">{t("jobPostingsModal.aiFiltering")}</p>
            </div>
          </div>
        )}

        <div className="flex h-[calc(95vh-120px)]">
          {/* Smart Filters Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-4 overflow-y-auto max-h-full">
            <div className="space-y-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t("jobPostingsModal.smartFilters")}
              </h3>
              <p className="text-xs text-gray-600 mb-4">
                {t("jobPostingsModal.filtersStatus").replace("{{count}}", String(activeFiltersCount))}
              </p>

              {/* Workplace Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('workplace')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>{t("jobPostingsModal.filters.workplace")}</span>
                  <div className="flex items-center gap-2">
                    {filters.workplace.length > 0 && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        {filters.workplace.length}
                      </span>
                    )}
                    {expandedFilters.workplace ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>
                {expandedFilters.workplace && (
                  <div className="mt-2 space-y-2 pl-2">
                    {workplaceOptions.map(({ value, label }) => (
                      <div key={value} className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Checkbox
                          id={`workplace-${value}`}
                          checked={filters.workplace.includes(value)}
                          onCheckedChange={() => toggleWorkplaceFilter(value)}
                        />
                        <label
                          htmlFor={`workplace-${value}`}
                          className="text-sm text-gray-700 cursor-pointer"
                        >
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Country Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('country')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>{t("jobPostingsModal.filters.country")}</span>
                  {expandedFilters.country ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.country && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.country} onValueChange={(value) => {
                      updateFilter('country', value);
                      // Clear city when country changes
                      updateFilter('city', '');
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("jobPostingsModal.filters.selectCountry")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.keys(COUNTRIES_CITIES).map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* City Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('city')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>{t("jobPostingsModal.filters.city")}</span>
                  {expandedFilters.city ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.city && (
                  <div className="mt-2 pl-2">
                    <Select 
                      value={filters.city} 
                      onValueChange={(value) => updateFilter('city', value)}
                      disabled={!filters.country}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={
                          filters.country ? t("jobPostingsModal.filters.selectCity") : t("jobPostingsModal.filters.selectCountryFirst")
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {filters.country && COUNTRIES_CITIES[filters.country as keyof typeof COUNTRIES_CITIES]?.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Career Level Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('careerLevel')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>{t("jobPostingsModal.filters.careerLevel")}</span>
                  {expandedFilters.careerLevel ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.careerLevel && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.careerLevel} onValueChange={(value) => updateFilter('careerLevel', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("jobPostingsModal.filters.selectLevel")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">{t("dashboard.entryLevel")}</SelectItem>
                        <SelectItem value="junior">{t("dashboard.junior")}</SelectItem>
                        <SelectItem value="mid">{t("dashboard.midLevel")}</SelectItem>
                        <SelectItem value="senior">{t("dashboard.senior")}</SelectItem>
                        <SelectItem value="lead">{t("dashboard.lead")}</SelectItem>
                        <SelectItem value="manager">{t("dashboard.manager")}</SelectItem>
                        <SelectItem value="director">{t("dashboard.director")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Job Category Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('jobCategory')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>{t("jobPostingsModal.filters.jobCategory")}</span>
                  {expandedFilters.jobCategory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.jobCategory && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.jobCategory} onValueChange={(value) => updateFilter('jobCategory', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("jobPostingsModal.filters.selectCategory")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="engineering">{t("jobPostingsModal.filters.jobCategoryOptions.engineering")}</SelectItem>
                        <SelectItem value="marketing">{t("jobPostingsModal.filters.jobCategoryOptions.marketing")}</SelectItem>
                        <SelectItem value="sales">{t("jobPostingsModal.filters.jobCategoryOptions.sales")}</SelectItem>
                        <SelectItem value="finance">{t("jobPostingsModal.filters.jobCategoryOptions.finance")}</SelectItem>
                        <SelectItem value="hr">{t("jobPostingsModal.filters.jobCategoryOptions.hr")}</SelectItem>
                        <SelectItem value="design">{t("jobPostingsModal.filters.jobCategoryOptions.design")}</SelectItem>
                        <SelectItem value="product">{t("jobPostingsModal.filters.jobCategoryOptions.product")}</SelectItem>
                        <SelectItem value="operations">{t("jobPostingsModal.filters.jobCategoryOptions.operations")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Job Type Filter */}
              <div className="border-b pb-3 mb-3">
                <button
                  onClick={() => toggleFilter('jobType')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>{t("jobPostingsModal.filters.jobType")}</span>
                  {expandedFilters.jobType ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.jobType && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.jobType} onValueChange={(value) => updateFilter('jobType', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("jobPostingsModal.filters.selectType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">{t("dashboard.fullTime")}</SelectItem>
                        <SelectItem value="part-time">{t("dashboard.partTime")}</SelectItem>
                        <SelectItem value="contract">{t("dashboard.contract")}</SelectItem>
                        <SelectItem value="freelance">{t("dashboard.freelance")}</SelectItem>
                        <SelectItem value="internship">{t("dashboard.internship")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Date Posted Filter */}
              <div className="pb-3">
                <button
                  onClick={() => toggleFilter('datePosted')}
                  className="flex items-center justify-between w-full py-2 text-left text-sm font-medium text-gray-900 hover:text-blue-600"
                >
                  <span>{t("jobPostingsModal.filters.datePosted")}</span>
                  {expandedFilters.datePosted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {expandedFilters.datePosted && (
                  <div className="mt-2 pl-2">
                    <Select value={filters.datePosted} onValueChange={(value) => updateFilter('datePosted', value)}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("jobPostingsModal.filters.selectTimeframe")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">{t("jobPostingsModal.filters.dateOptions.today")}</SelectItem>
                        <SelectItem value="yesterday">{t("jobPostingsModal.filters.dateOptions.yesterday")}</SelectItem>
                        <SelectItem value="week">{t("jobPostingsModal.filters.dateOptions.week")}</SelectItem>
                        <SelectItem value="month">{t("jobPostingsModal.filters.dateOptions.month")}</SelectItem>
                        <SelectItem value="3months">{t("jobPostingsModal.filters.dateOptions.threeMonths")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col max-h-full">
            {/* Search Bar */}
            <div className="p-4 border-b bg-white flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t("jobPostingsModal.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Smart Notice */}
            {showRelatedNotice && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex-shrink-0">
                <p className="text-sm text-blue-800">
                  <Zap className="h-4 w-4 inline mr-1" />
                  {t("jobPostingsModal.relatedNotice")}
                </p>
              </div>
            )}

            {/* Job Results - Now properly scrollable */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="text-red-500 mb-2">{t("jobPostingsModal.errorTitle")}</div>
                  <p className="text-gray-600">{t("jobPostingsModal.errorDescription")}</p>
                </div>
              ) : displayedJobs.length === 0 ? (
                <div className="text-center py-12">
                  {jobPostings.length === 0 ? (
                    <div className="max-w-md mx-auto">
                      <div className="text-6xl mb-4">🎭</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("jobPostingsModal.emptyStates.noPostingsTitle")}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {getRandomFunnyMessage()}
                      </p>
                      <Button
                        onClick={async () => {
                          setIsRefreshing(true);
                          await refetch();
                          setTimeout(() => setIsRefreshing(false), 1000);
                        }}
                        disabled={isRefreshing}
                        className="mt-4"
                        variant="outline"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {t("jobPostingsModal.buttons.refreshJobs")}
                      </Button>
                    </div>
                  ) : (
                    // SILENT FILTERING: When filters are applied but no jobs match, show nothing
                    hasActiveFilters ? null : (
                      <div className="text-center py-8">
                        <div className="text-4xl mb-4">🔍</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("jobPostingsModal.emptyStates.noMatchesTitle")}</h3>
                        <p className="text-gray-600">{t("jobPostingsModal.emptyStates.noMatchesDescription")}</p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedJobs.map((job: JobPosting, index: number) => {
                    const matchScore = calculateAIMatchScore(job);
                    const jobTags = getJobTags(job);
                    const isPending = (job as any).isPendingApplication === true;

                    return (
                      <motion.div
                        key={job.recordId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer group ${
                          isPending ? 'border-4 border-blue-500 bg-blue-50/50 shadow-xl ring-4 ring-blue-100' :
                          matchScore >= 80 ? 'border-green-200 bg-green-50/30' :
                          matchScore >= 60 ? 'border-yellow-200 bg-yellow-50/30' :
                          'border-gray-200'
                        }`}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-semibold text-blue-600 text-lg hover:text-blue-800 cursor-pointer">
                                    {job.title}
                                  </h3>
                                  {isPending && (
                                    <div className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded-full animate-pulse">
                                      <AlertCircle className="h-4 w-4" />
                                      <span className="text-xs font-bold">
                                        {t("jobPostingsModal.badges.pending")}
                                      </span>
                                    </div>
                                  )}
                                  <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                                    matchScore >= 80 ? 'bg-green-100 text-green-800' :
                                    matchScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    <Star className="h-3 w-3" />
                                    <span className="text-xs font-medium">
                                      {t("jobPostingsModal.labels.match").replace("{{percentage}}", (isNaN(matchScore) ? '50' : String(matchScore)))}
                                    </span>
                                  </div>
                                  {matchScore >= 80 && (
                                    <div className="flex items-center gap-1 bg-blue-100 px-2 py-1 rounded">
                                      <Zap className="h-3 w-3 text-blue-600" />
                                      <span className="text-xs font-medium text-blue-800">
                                        {t("jobPostingsModal.badges.recommended")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-gray-900 font-medium">{job.companyName}</span>
                                  <span className="text-gray-500">•</span>
                                  <span className="text-gray-600 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {job.location || t("jobPostingsModal.labels.locationNotSpecified")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                  {jobTags.map((tag, tagIndex) => (
                                    <Badge 
                                      key={tagIndex}
                                      variant={tag.variant || "secondary"}
                                      className="text-xs"
                                    >
                                      {tag.label}
                                    </Badge>
                                  ))}
                                  <span className="text-gray-500 text-sm">
                                    {job.postedAt ? formatDate(job.postedAt) : t("jobPostingsModal.labels.recentlyPosted")}
                                  </span>
                                </div>
                                <div className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3 prose prose-sm max-w-none">
                                  <ReactMarkdown>{job.description}</ReactMarkdown>
                                </div>
                                {job.skills && job.skills.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mb-4">
                                    {job.skills.slice(0, 4).map((skill) => (
                                      <Badge 
                                        key={skill} 
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {skill}
                                      </Badge>
                                    ))}
                                    {job.skills.length > 4 && (
                                      <Badge variant="outline" className="text-xs">
                                        {t("jobPostingsModal.labels.moreSkills").replace("{{count}}", String(job.skills.length - 4))}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedJob(job);
                                      setViewedJobDetails(prev => new Set([...prev, job.recordId]));
                                      if (isPending) clearPendingApplication();
                                    }}
                                    className="flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {t("jobPostingsModal.buttons.viewDetails")}
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      handleApply(job);
                                      if (isPending) clearPendingApplication();
                                    }}
                                    disabled={newApplicationMutation.isPending}
                                    className="flex items-center gap-1"
                                  >
                                    {newApplicationMutation.isPending ? (
                                      <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                        {t("jobPostingsModal.aiAnalyzing")}
                                      </>
                                    ) : (
                                      <>
                                        <ArrowRight className="h-3 w-3" />
                                        {t("jobPostingsModal.buttons.apply")}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="ml-6 flex-shrink-0 flex items-center">
                                <div className="w-16 h-16 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                                  <Building className="w-8 h-8 text-gray-400" />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Job Details Panel */}
        <AnimatePresence>
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black bg-opacity-30 flex z-40"
            >
              <div 
                className="flex-1" 
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Backdrop clicked');
                  setSelectedJob(null);
                }} 
              />
              
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-2/3 max-w-3xl bg-white shadow-2xl flex flex-col"
              >
                {/* Sticky Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-gray-900">
                          {selectedJob.title}
                        </h2>
                        <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
                          <Star className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">
                            {t("jobPostingsModal.labels.match").replace(
                              "{{percentage}}",
                              (() => {
                                const score = calculateAIMatchScore(selectedJob);
                                return isNaN(score) ? '50' : String(score);
                              })()
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{selectedJob.companyName}</span>
                        <span>•</span>
                        <MapPin className="h-4 w-4" />
                        <span>{selectedJob.location || t("jobPostingsModal.labels.remoteFallback")}</span>
                        <span>•</span>
                        <Clock className="h-4 w-4" />
                        <span>{selectedJob.postedAt ? formatDate(selectedJob.postedAt) : t("jobPostingsModal.labels.recentlyPosted")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Back button clicked');
                          setSelectedJob(null);
                        }}
                        className="hover:bg-gray-100"
                        title={t("jobPostingsModal.buttons.backToList")}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Close button clicked');
                          handleClose();
                        }}
                        className="hover:bg-gray-100"
                        title={t("close")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {/* Job Overview */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">{t("jobPostingsModal.info.employmentType")}</h4>
                        <p className="text-gray-700">{selectedJob.employmentType || t("jobPostingsModal.info.fullTimeFallback")}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-2">{t("jobPostingsModal.info.experienceLevel")}</h4>
                        <p className="text-gray-700">{selectedJob.experienceLevel || t("jobPostingsModal.info.notSpecified")}</p>
                      </div>
                      {selectedJob.salaryRange && (
                        <div className="bg-gray-50 p-4 rounded-lg col-span-2">
                          <h4 className="font-semibold text-gray-900 mb-2">{t("jobPostingsModal.info.salaryRange")}</h4>
                          <p className="text-gray-700">{selectedJob.salaryRange}</p>
                        </div>
                      )}
                    </div>

                    {/* Job Description */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("jobPostingsModal.info.jobDescription")}</h3>
                      <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                        <ReactMarkdown>{selectedJob.description}</ReactMarkdown>
                      </div>
                    </div>

                    {/* AI Prompt */}
                    {selectedJob.aiPrompt && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("jobPostingsModal.info.aiPrompt")}</h3>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                          <p className="text-purple-800 text-sm leading-relaxed whitespace-pre-wrap">
                            {selectedJob.aiPrompt}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Skills & Requirements */}
                    {selectedJob.skills && selectedJob.skills.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("jobPostingsModal.info.requiredSkills")}</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills.map((skill) => (
                            <Badge key={skill} variant="outline" className="text-sm">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Company Information */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {t("jobPostingsModal.info.aboutCompany").replace("{{company}}", selectedJob.companyName)}
                      </h3>
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-gray-700">
                          {t("jobPostingsModal.info.aboutCompanyDescription")
                            .replace("{{company}}", selectedJob.companyName)}
                        </p>
                      </div>
                    </div>

                    {/* Application Tips */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("jobPostingsModal.info.applicationTips")}</h3>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex items-start gap-2">
                            <span className="text-yellow-600">•</span>
                            <span>{t("jobPostingsModal.info.applicationTip1")}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-yellow-600">•</span>
                            <span>{t("jobPostingsModal.info.applicationTip2")}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-yellow-600">•</span>
                            <span>{t("jobPostingsModal.info.applicationTip3")}</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Spacer for sticky button */}
                    <div className="h-20"></div>
                  </div>
                </div>

                {/* Always-Visible Apply Button */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Star className="h-4 w-4 text-green-600" />
                        <span className="font-medium">
                          {t("jobPostingsModal.labels.match").replace(
                            "{{percentage}}",
                            (() => {
                              const score = calculateAIMatchScore(selectedJob);
                              return isNaN(score) ? '50' : String(score);
                            })()
                          )}
                        </span>
                      </div>
                      <div className="h-4 w-px bg-gray-300"></div>
                      <div className="text-sm text-gray-600">
                        {selectedJob.location || t("jobPostingsModal.labels.remoteFallback")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rtl:space-x-reverse">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedJob(null)}
                      >
                        {t("close")}
                      </Button>
                      <Button
                        onClick={() => proceedWithApplication(selectedJob)}
                        disabled={newApplicationMutation.isPending}
                        className="flex items-center gap-2 px-6"
                      >
                        {newApplicationMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {t("jobPostingsModal.aiAnalyzing")}
                          </>
                        ) : (
                          <>
                            <ArrowRight className="h-4 w-4" />
                            {t("jobPostingsModal.buttons.applyNow")}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Application Analysis Modal */}
        <AnimatePresence>
          {showApplicationAnalysis && applicationAnalysis && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowApplicationAnalysis(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg max-w-lg w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      {applicationAnalysis.isGoodMatch ? (
                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full">
                          <AlertTriangle className="h-6 w-6 text-orange-600" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          {t("jobPostingsModal.analysis.title")}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {t("jobPostingsModal.analysis.subtitle")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApplicationAnalysis(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Job Info */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="h-4 w-4 text-gray-600" />
                      <h4 className="font-medium text-gray-900">{selectedJob?.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building className="h-3 w-3" />
                      <span>{selectedJob?.companyName}</span>
                    </div>
                  </div>

                  {/* Match Result */}
                  {applicationAnalysis.isGoodMatch ? (
                    <div className="p-4 rounded-lg mb-6 bg-green-50 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-800">{t("jobPostingsModal.analysis.matchTitle")}</h4>
                      </div>
                      <p className="text-sm text-green-700">
                        {t("jobPostingsModal.analysis.matchDescription")}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg mb-6 bg-orange-50 border border-orange-200">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <h4 className="font-medium text-orange-800">{t("jobPostingsModal.analysis.missingTitle")}</h4>
                      </div>
                      {applicationAnalysis.missingRequirements && applicationAnalysis.missingRequirements.length > 0 && (
                        <div className="space-y-1">
                          {applicationAnalysis.missingRequirements.map((missing, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                              <p className="text-sm text-orange-800">{missing}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t">
                    {applicationAnalysis.isGoodMatch ? (
                      <Button
                        onClick={handleConfirmApplication}
                        disabled={actualApplicationMutation.isPending}
                        className="flex items-center gap-2 flex-1"
                      >
                        {actualApplicationMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {t("jobPostingsModal.analysis.submitting")}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            {t("jobPostingsModal.analysis.submit")}
                          </>
                        )}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleConfirmApplication}
                          disabled={actualApplicationMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          {actualApplicationMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                              {t("jobPostingsModal.analysis.applying")}
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4" />
                              {t("jobPostingsModal.analysis.applyAnyway")}
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => setShowApplicationAnalysis(false)}
                          className="flex items-center gap-2 flex-1"
                        >
                          <Search className="h-4 w-4" />
                          {t("jobPostingsModal.analysis.findBetterMatches")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fun AI Loading Modal */}
        <AnimatePresence>
          {showAILoadingModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[60]"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-white rounded-xl p-8 max-w-md w-full text-center shadow-2xl border border-blue-100"
              >
                <div className="space-y-6">
                  {/* Animated AI Brain */}
                  <div className="relative mx-auto w-20 h-20">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{ 
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl"
                    >
                      🧠
                    </motion.div>
                    <motion.div
                      animate={{ 
                        opacity: [0.3, 0.8, 0.3],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{ 
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-blue-400 rounded-full blur-md -z-10"
                    />
                  </div>

                  {/* Fun Loading Messages or Result */}
                  <div className="space-y-3">
                    {aiLoadingResult.type === null ? (
                      <>
                        <h3 className="text-xl font-bold text-gray-900">
                          {t("jobPostingsModal.aiAssistant.title")}
                        </h3>
                        <motion.div
                          key={Math.random()}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <p className="text-gray-600 font-medium">
                            {t("jobPostingsModal.aiAssistant.analyzing")}
                          </p>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="mx-auto w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
                          />
                        </motion.div>
                        
                        {/* Fun rotating messages */}
                        <motion.p
                          key={Date.now()}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-sm text-blue-600 italic"
                        >
                          {getRandomAiAssistantMessage()}
                        </motion.p>
                      </>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="space-y-3"
                      >
                        <h3 className={`text-xl font-bold ${
                          aiLoadingResult.type === 'success' ? 'text-green-600' : 
                          aiLoadingResult.type === 'info' ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {aiLoadingResult.type === 'success'
                            ? t("jobPostingsModal.aiAssistant.successTitle")
                            : aiLoadingResult.type === 'info'
                              ? t("jobPostingsModal.aiAssistant.alreadyAppliedTitle")
                              : t("jobPostingsModal.aiAssistant.errorTitle")}
                        </h3>
                        <p className={`text-sm font-medium whitespace-pre-line ${
                          aiLoadingResult.type === 'success' ? 'text-green-700' : 
                          aiLoadingResult.type === 'info' ? 'text-blue-700' : 'text-red-700'
                        }`}>
                          {aiLoadingResult.message}
                        </p>
                        <Button
                          onClick={() => {
                            setShowAILoadingModal(false);
                            setAiLoadingResult({ type: null, message: '' });
                          }}
                          className="mt-4"
                        >
                          {t("close")}
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  {/* Progress dots */}
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ 
                          scale: [1, 1.3, 1],
                          opacity: [0.4, 1, 0.4]
                        }}
                        transition={{ 
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.2
                        }}
                        className="w-2 h-2 bg-blue-500 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </DialogContent>

      {/* Employer Questions Modal */}
      <EmployerQuestionsModal
        isOpen={showEmployerQuestions}
        onClose={() => {
          setShowEmployerQuestions(false);
          setPendingApplication(null);
        }}
        onSubmit={handleEmployerQuestionsSubmit}
        jobTitle={pendingApplication?.jobTitle || ''}
        companyName={pendingApplication?.companyName || ''}
        jobId={pendingApplication?.recordId || ''}
      />
    </Dialog>
  );
}