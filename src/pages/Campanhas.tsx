import { useMemo } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ribbon, Heart, Calendar } from "lucide-react";
import { campaignData, MonthCampaign } from "@/data/campaignData";

const Campanhas = () => {
  const currentMonth = new Date().getMonth() + 1;

  const RibbonIcon = ({ colors }: { colors: string[] }) => {
    if (colors.length === 1) {
      return (
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${colors[0]}20` }}
        >
          <Ribbon className="h-8 w-8" style={{ color: colors[0] }} />
        </div>
      );
    }

    return (
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ 
          background: `linear-gradient(135deg, ${colors.map(c => `${c}20`).join(", ")})` 
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8"
        >
          <defs>
            <linearGradient id={`gradient-${colors.join("-")}`} x1="0%" y1="0%" x2="100%" y2="100%">
              {colors.map((color, index) => (
                <stop
                  key={index}
                  offset={`${(index / (colors.length - 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          </defs>
          <path
            d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
            stroke={`url(#gradient-${colors.join("-")})`}
            fill={`url(#gradient-${colors.join("-")})`}
            fillOpacity="0.3"
          />
          <path
            d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"
            stroke={`url(#gradient-${colors.join("-")})`}
          />
          <path
            d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"
            stroke={`url(#gradient-${colors.join("-")})`}
          />
        </svg>
      </div>
    );
  };

  const MonthCard = ({ monthData }: { monthData: MonthCampaign }) => {
    const isCurrentMonth = monthData.month === currentMonth;
    const colors = monthData.campaigns.map(c => c.color);

    return (
      <Card 
        className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
          isCurrentMonth ? "ring-2 ring-primary shadow-lg" : ""
        }`}
      >
        {isCurrentMonth && (
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium rounded-bl-lg">
            Mês Atual
          </div>
        )}
        
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <RibbonIcon colors={colors} />
            <div>
              <CardTitle className="text-xl">{monthData.monthName}</CardTitle>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {monthData.campaigns.map((campaign, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs font-normal"
                    style={{ 
                      backgroundColor: `${campaign.color}20`,
                      color: campaign.color,
                      borderColor: campaign.color
                    }}
                  >
                    {campaign.colorName}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {monthData.campaigns.map((campaign, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-lg border-l-4"
              style={{ 
                borderLeftColor: campaign.color,
                backgroundColor: `${campaign.color}08`
              }}
            >
              <h4 className="font-semibold text-sm mb-1" style={{ color: campaign.color }}>
                {campaign.name}
              </h4>
              <p className="text-sm text-muted-foreground">
                {campaign.description}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                Campanhas de <span className="text-gradient">Conscientização</span>
              </h1>
              <p className="text-muted-foreground mt-1">
                Cores e causas que importam durante todo o ano
              </p>
            </div>
          </div>
          
          <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-none mt-6">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Durante o ano, diversas campanhas de conscientização utilizam cores específicas para 
                  alertar sobre doenças, estimular a prevenção e promover o cuidado com a saúde. 
                  Conheça todas as causas, mês a mês.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Campaign Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaignData.map((monthData, index) => (
            <div
              key={monthData.month}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <MonthCard monthData={monthData} />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Campanhas;
