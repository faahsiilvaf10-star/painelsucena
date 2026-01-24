import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Ribbon, ArrowRight, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentMonthCampaigns } from "@/data/campaignData";

export const CampaignBanner = () => {
  const currentMonthData = useMemo(() => getCurrentMonthCampaigns(), []);

  if (!currentMonthData) return null;

  const colors = currentMonthData.campaigns.map(c => c.color);
  const gradientColors = colors.length > 1 
    ? `linear-gradient(135deg, ${colors.map(c => `${c}15`).join(", ")})`
    : `${colors[0]}10`;

  const borderGradient = colors.length > 1
    ? `linear-gradient(135deg, ${colors.join(", ")})`
    : colors[0];

  return (
    <Card 
      className="relative overflow-hidden mb-6 border-0 animate-fade-in"
      style={{ background: gradientColors }}
    >
      {/* Gradient border effect */}
      <div 
        className="absolute inset-0 rounded-lg p-[2px]"
        style={{ 
          background: borderGradient,
          mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          maskComposite: "xor",
          WebkitMaskComposite: "xor",
          pointerEvents: "none"
        }}
      />

      {/* Animated ribbon decorations */}
      <div className="absolute -top-4 -right-4 opacity-10">
        <Ribbon className="h-32 w-32 rotate-12" style={{ color: colors[0] }} />
      </div>
      <div className="absolute -bottom-6 -left-6 opacity-10">
        <Heart className="h-24 w-24 -rotate-12" style={{ color: colors[colors.length - 1] }} />
      </div>

      <CardContent className="relative py-5 px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left side - Campaign info */}
          <div className="flex items-start gap-4">
            {/* Ribbon icon with gradient */}
            <div 
              className="p-3 rounded-full flex-shrink-0"
              style={{ 
                background: colors.length > 1 
                  ? `linear-gradient(135deg, ${colors.map(c => `${c}30`).join(", ")})`
                  : `${colors[0]}25`
              }}
            >
              {colors.length > 1 ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <defs>
                    <linearGradient id="bannerRibbonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
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
                    stroke="url(#bannerRibbonGradient)"
                    fill="url(#bannerRibbonGradient)"
                    fillOpacity="0.3"
                  />
                  <path
                    d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"
                    stroke="url(#bannerRibbonGradient)"
                  />
                  <path
                    d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"
                    stroke="url(#bannerRibbonGradient)"
                  />
                </svg>
              ) : (
                <Ribbon className="h-6 w-6" style={{ color: colors[0] }} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-foreground">
                  {currentMonthData.monthName} - Mês da Conscientização
                </h3>
                {currentMonthData.campaigns.map((campaign, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="text-xs"
                    style={{ 
                      backgroundColor: `${campaign.color}20`,
                      color: campaign.color,
                    }}
                  >
                    {campaign.colorName}
                  </Badge>
                ))}
              </div>
              
              <div className="space-y-1">
                {currentMonthData.campaigns.map((campaign, idx) => (
                  <p key={idx} className="text-sm text-muted-foreground">
                    <span className="font-medium" style={{ color: campaign.color }}>
                      {campaign.name}:
                    </span>{" "}
                    {campaign.description}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - CTA */}
          <div className="flex-shrink-0">
            <Button 
              asChild 
              variant="outline"
              className="group"
              style={{ 
                borderColor: colors[0],
                color: colors[0],
              }}
            >
              <Link to="/campanhas">
                Ver todas
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
