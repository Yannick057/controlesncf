import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyAdminsRequest {
  action: "suspension" | "deletion" | "role_change";
  targetUserEmail: string;
  targetUserName?: string;
  performedByEmail: string;
  performedByName?: string;
  details?: string;
}

const ACTION_LABELS: Record<string, string> = {
  suspension: "Suspension de compte",
  deletion: "Suppression de compte",
  role_change: "Changement de rôle admin",
};

async function sendEmail(to: string[], subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "SNCF Contrôles <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error: ${error}`);
  }

  return res.json();
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Token invalide" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if caller has admin or manager role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "manager"].includes(roleData.role)) {
      console.error("User does not have required role");
      return new Response(
        JSON.stringify({ error: "Permissions insuffisantes" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const body: NotifyAdminsRequest = await req.json();
    const { action, targetUserEmail, targetUserName, performedByEmail, performedByName, details } = body;

    console.log("Notification request received:", { action, targetUserEmail, performedByEmail });

    // Get all admin emails
    const { data: adminRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Erreur lors de la récupération des administrateurs");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "Aucun administrateur à notifier" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails from profiles
    const adminIds = adminRoles.map(r => r.user_id);
    const { data: adminProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", adminIds);

    if (profilesError) {
      console.error("Error fetching admin profiles:", profilesError);
      throw new Error("Erreur lors de la récupération des profils administrateurs");
    }

    const adminEmails = adminProfiles
      ?.map(p => p.email)
      .filter((email): email is string => !!email) || [];

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ success: true, message: "Aucune adresse email d'administrateur trouvée" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Sending notification to ${adminEmails.length} admin(s):`, adminEmails);

    const actionLabel = ACTION_LABELS[action] || action;
    const timestamp = new Date().toLocaleString("fr-FR", { 
      dateStyle: "long", 
      timeStyle: "short",
      timeZone: "Europe/Paris"
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Alerte de Sécurité</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">SNCF Contrôles - Action Sensible Détectée</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border: 1px solid #e9ecef; border-top: none;">
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #dc3545;">
            <h2 style="margin: 0 0 15px 0; color: #dc3545; font-size: 18px;">${actionLabel}</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 140px;">Utilisateur concerné:</td>
                <td style="padding: 8px 0; font-weight: 600;">${targetUserName || targetUserEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Email:</td>
                <td style="padding: 8px 0;">${targetUserEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Action effectuée par:</td>
                <td style="padding: 8px 0; font-weight: 600;">${performedByName || performedByEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Date et heure:</td>
                <td style="padding: 8px 0;">${timestamp}</td>
              </tr>
              ${details ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">Détails:</td>
                <td style="padding: 8px 0;">${details}</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <p style="margin: 20px 0 0 0; font-size: 13px; color: #666;">
            Cette notification est envoyée automatiquement suite à une action sensible dans l'application SNCF Contrôles.
            Si vous n'êtes pas à l'origine de cette action, veuillez vérifier immédiatement les logs d'audit.
          </p>
        </div>
        
        <div style="background: #1e3a5f; padding: 15px 30px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 12px;">
            © ${new Date().getFullYear()} SNCF Contrôles - Système de Gestion des Contrôles
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await sendEmail(
      adminEmails,
      `🔔 Alerte Sécurité: ${actionLabel}`,
      emailHtml
    );

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in notify-admins function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur interne" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
